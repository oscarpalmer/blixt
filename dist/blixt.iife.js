var Blixt = (function (exports) {
	('use strict');

	const blixt = 'blixt';
	const booleanAttributes = new Set([
		'checked',
		'disabled',
		'hidden',
		'inert',
		'multiple',
		'open',
		'readonly',
		'required',
		'selected',
	]);
	const classAttributeExpression = /^class\./i;
	const comment = `<!--${blixt}-->`;
	const keyTypes = new Set(['number', 'string', 'symbol']);
	const observers = new Map();
	const onAttributeExpression = /^on/i;
	const proxies = new WeakMap();
	const sourceAttributeNameExpression = /^(href|src|xlink:href)$/i;
	const sourceAttributeValueExpression = /(data:text\/html|javascript:)/i;
	const stateKey = '__state';
	const styleAttributeExpression = /^style\./i;
	const subscriptions = new WeakMap();
	const templateData = new WeakMap();
	const valueAttributeExpression = /^value$/i;

	function getKey(...parts) {
		return parts
			.filter(part => part !== undefined)
			.map(part => getString(part).trim())
			.filter(part => part.length > 0)
			.join('.');
	}
	function getString(value) {
		return typeof value === 'string' ? value : String(value);
	}
	function getValue(data, key) {
		if (typeof data !== 'object') {
			return data;
		}
		const parts = key.split('.');
		let value = data;
		for (const part of parts) {
			if (value === undefined) {
				return undefined;
			}
			value = value?.[part];
		}
		return value;
	}
	function isGenericObject(value) {
		return Array.isArray(value) || value?.constructor?.name === 'Object';
	}
	function isKey(value) {
		return keyTypes.has(typeof value);
	}

	// eslint-disable-next-line @typescript-eslint/no-extraneous-class
	class State {}

	function createStore(data, state, prefix) {
		if (isStore(data) || !isGenericObject(data)) {
			return data;
		}
		const isArray = Array.isArray(data);
		const isParent = !(state instanceof State);
		const proxyState = isParent ? new State() : state;
		const proxyValue = transformData(proxyState, prefix, data, isArray);
		const proxy = new Proxy(proxyValue, {
			get(target, property) {
				if (property === stateKey) {
					return proxyState;
				}
				observeKey(proxyState, getKey(prefix, property));
				const value = Reflect.get(target, property);
				if (isArray && property in Array.prototype) {
					return handleArray({
						value,
						array: proxyValue,
						callback: getString(property),
						prefix: prefix ?? '',
						state: proxyState,
					});
				}
				return value;
			},
			has(target, property) {
				return property === stateKey || Reflect.has(target, property);
			},
			set(target, property, value) {
				const oldValue = Reflect.get(target, property);
				const newValue = transformItem(proxyState, prefix, property, value);
				const setValue = Reflect.set(target, property, newValue);
				if (setValue) {
					let properties;
					let values;
					if (isStore(oldValue)) {
						properties = [];
						values = [];
						const oldKeys = Object.keys(oldValue);
						const newKeys = Object.keys(newValue);
						for (const key of oldKeys) {
							if (oldValue[key] !== newValue[key]) {
								properties.push(key);
								values.push(oldValue[key]);
							}
						}
						for (const key of newKeys) {
							if (!(key in oldValue)) {
								properties.push(key);
							}
						}
					}
					emit(
						proxyState,
						properties === undefined ? prefix : getKey(prefix, property),
						properties ?? [property],
						values ?? [oldValue],
					);
				}
				return setValue;
			},
		});
		Object.defineProperty(proxy, stateKey, {
			value: proxyState,
			writable: false,
		});
		if (isParent) {
			proxies.set(proxyState, proxy);
			subscriptions.set(proxyState, new Map());
		}
		return proxy;
	}
	function emit(state, prefix, properties, values) {
		const proxy = proxies.get(state);
		const keys = properties.map(property => getKey(prefix, property));
		const origin = properties.length > 1 ? prefix : keys[0];
		if (prefix !== undefined) {
			const parts = prefix.split('.');
			keys.push(
				...parts
					.map((_, index) => parts.slice(0, index + 1).join('.'))
					.reverse(),
			);
		}
		for (const key of keys) {
			const subscribers = subscriptions.get(state)?.get(key);
			if (subscribers === undefined) {
				continue;
			}
			const callbacks = Array.from(subscribers);
			const emitOrigin = key === origin ? undefined : origin;
			const newValue = getValue(proxy, key);
			const oldValue = values[keys.indexOf(key)] ?? undefined;
			for (const callback of callbacks) {
				callback(newValue, oldValue, emitOrigin);
			}
		}
	}
	function handleArray(parameters) {
		const {array, callback, state, prefix} = parameters;
		function synthetic(...args) {
			const oldArray = array.slice(0);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			const result = Array.prototype[callback].apply(array, args);
			const properties = [];
			const values = [];
			for (const item of oldArray) {
				const index = oldArray.indexOf(item);
				if (item !== array[index]) {
					properties.push(index);
					values.push(oldArray[index]);
				}
			}
			for (let index = oldArray.length; index < array.length; index += 1) {
				properties.push(index);
			}
			emit(state, prefix, properties, values);
			return result;
		}
		switch (callback) {
			case 'copyWithin':
			case 'pop':
			case 'reverse':
			case 'shift':
			case 'sort': {
				return synthetic;
			}
			case 'fill':
			case 'push':
			case 'unshift': {
				return (...items) =>
					synthetic(...transformData(state, prefix, items, true));
			}
			case 'splice': {
				return (start, remove, ...items) =>
					synthetic(
						start,
						remove,
						...transformData(state, prefix, items, true),
					);
			}
			default: {
				return parameters.value;
			}
		}
	}
	/**
	 * Is the value a reactive store?
	 */
	function isStore(value) {
		return value?.[stateKey] instanceof State;
	}
	/**
	 * Creates a reactive store
	 * @template {Data} T
	 * @param {T} data
	 * @returns {Store<T>}
	 */
	function store(data) {
		if (typeof data !== 'object') {
			throw new TypeError('Data must be an object');
		}
		return createStore(data);
	}
	function transformData(state, prefix, data, isArray) {
		const value = isArray ? [] : Object.create(data, {});
		for (const key in data) {
			if (key in data) {
				value[key] = transformItem(state, prefix, key, data[key]);
			}
		}
		return value;
	}
	function transformItem(state, prefix, key, value) {
		return typeof value === 'object' && value !== null
			? createStore(value, state, getKey(prefix, key))
			: value;
	}

	/**
	 * Subscribes to value changes for a key in a store
	 * @template {Data} T
	 * @param {Store<T>} store
	 * @param {number|string|symbol} key
	 * @param {(newValue: any, oldValue?: any, origin?: string) => void} callback
	 * @returns {void}
	 */
	function subscribe(store, key, callback) {
		validate(store, key, callback);
		const stored = subscriptions.get(store?.[stateKey]);
		const keyAsString = getString(key);
		const subscribers = stored.get(keyAsString);
		if (subscribers === undefined) {
			stored.set(keyAsString, new Set([callback]));
		} else if (!subscribers.has(callback)) {
			subscribers.add(callback);
		}
	}
	/**
	 * Unsubscribes from value changes for a key in a store
	 * @template {Data} T
	 * @param {Store<T>} store
	 * @param {number|string|symbol} key
	 * @param {(newValue: any, oldValue?: any, origin?: string) => void} callback
	 * @returns {void}
	 */
	function unsubscribe(store, key, callback) {
		validate(store, key, callback);
		const stored = subscriptions.get(store?.[stateKey]);
		const subscribers = stored?.get(String(key));
		subscribers?.delete(callback);
	}
	function validate(store, key, callback) {
		if (!isStore(store)) {
			throw new TypeError('Store must be a store');
		}
		if (!isKey(key)) {
			throw new TypeError('Key must be a number, string, or symbol');
		}
		if (typeof callback !== 'function') {
			throw new TypeError('Callback must be a function');
		}
	}

	/**
	 * Observes changes for properties used in a function
	 * @param {() => any} callback
	 * @param {{(value: any) => any}=} after
	 * @returns {any}
	 */
	function observe(callback, after) {
		if (typeof callback !== 'function') {
			throw new TypeError('Callback must be a function');
		}
		if (after !== undefined && typeof after !== 'function') {
			throw new TypeError('After-callback must be a function');
		}
		const hasAfter = typeof after === 'function';
		const id = Symbol(undefined);
		const queue = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				frame = undefined;
				run();
			});
		};
		let current = observers.get(id) ?? new Map();
		let frame;
		function run() {
			observers.set(id, new Map());
			const value = callback();
			const observed = observers.get(id) ?? new Map();
			const currentEntries = Array.from(current.entries());
			for (const [proxy, keys] of currentEntries) {
				const newKeys = observed.get(proxy) ?? new Set();
				const keysValues = Array.from(keys.values());
				for (const key of keysValues) {
					if (!newKeys.has(key)) {
						unsubscribe(proxy, key, queue);
					}
				}
			}
			const observedEntries = Array.from(observed.entries());
			for (const [proxy, keys] of observedEntries) {
				const keysValues = Array.from(keys.values());
				for (const key of keysValues) {
					subscribe(proxy, key, queue);
				}
			}
			current = observed;
			return hasAfter ? after(value) : value;
		}
		return run();
	}
	function observeKey(state, key) {
		const proxy = proxies.get(state);
		const values = Array.from(observers.values());
		for (const map of values) {
			const keys = map.get(proxy);
			if (keys === undefined) {
				map.set(proxy, new Set([key]));
			} else {
				keys.add(key);
			}
		}
	}

	function observeAttribute(element, attribute, expression) {
		const {name} = attribute;
		const isBoolean = booleanAttributes.has(name.toLowerCase());
		const isClass = classAttributeExpression.test(name);
		const isStyle = styleAttributeExpression.test(name);
		if (isBoolean || isClass || isStyle) {
			element.removeAttribute(name);
		}
		if (isBoolean) {
			observeBooleanAttribute(element, name, expression);
		} else if (isClass) {
			observeClassAttribute(element, name, expression);
		} else if (isStyle) {
			observeStyleAttribute(element, name, expression);
		} else {
			observeValueAttribute(element, name, expression);
		}
	}
	function observeBooleanAttribute(element, name, expression) {
		observe(expression.value, value => {
			if (typeof value === 'boolean') {
				element[name] = value;
			}
		});
	}
	function observeClassAttribute(element, name, expression) {
		const classes = name
			.split('.')
			.slice(1)
			.map(name => name.trim())
			.filter(name => name.length > 0);
		if (classes.length === 0) {
			return;
		}
		observe(expression.value, value => {
			if (value === true) {
				element.classList.add(...classes);
			} else {
				element.classList.remove(...classes);
			}
		});
	}
	function observeStyleAttribute(element, name, expression) {
		const [, first, second] = name.split('.');
		const property = first.trim();
		const suffix = second?.trim();
		if (
			property.length === 0 ||
			(suffix !== undefined && suffix.length === 0)
		) {
			return;
		}
		observe(expression.value, value => {
			if (
				value === undefined ||
				value === null ||
				value === false ||
				(value === true && suffix === undefined)
			) {
				element.style.removeProperty(property);
			} else {
				element.style.setProperty(
					property,
					value === true ? suffix : `${value}${suffix ?? ''}`,
				);
			}
		});
	}
	function observeValueAttribute(element, name, expression) {
		observe(expression.value, value => {
			if (valueAttributeExpression.test(name)) {
				element.value = value;
			}
			if (value === undefined || value === null) {
				element.removeAttribute(name);
			} else {
				element.setAttribute(name, value);
			}
		});
	}

	function observeContent(comment, expression) {
		let current;
		let isText = false;
		observe(expression.value, value => {
			const isArray = Array.isArray(value);
			if (value === undefined || value === null || isArray) {
				isText = false;
				current =
					isArray && value.length > 0
						? updateArray(comment, current, value)
						: current === undefined
						? undefined
						: replaceNodes(current, [[comment]], false);
				return;
			}
			const node = createNode(value);
			if (current !== undefined && isText && node instanceof Text) {
				if (current[0][0].textContent !== node.textContent) {
					current[0][0].textContent = node.textContent;
				}
				return;
			}
			isText = node instanceof Text;
			current = replaceNodes(current ?? [[comment]], getNodes(node), true);
		});
	}
	function updateArray(comment, current, array) {
		return replaceNodes(
			current ?? [[comment]],
			getNodes(array.map(item => createNode(item))),
			true,
		);
	}

	function addEvent(element, attribute, expression) {
		const {name, options} = getEventParameters(attribute.name);
		element.addEventListener(name, expression.value, options);
		element.removeAttribute(attribute.name);
	}
	function getEventParameters(attribute) {
		let name = attribute.slice(1);
		const options = {
			passive: true,
		};
		if (name.includes(':')) {
			const [event, ...items] = name.split(':');
			name = event;
			const normalised = new Set(items.map(item => item.toLowerCase()));
			options.capture = normalised.has('capture');
			options.once = normalised.has('once');
			options.passive = !normalised.has('active');
		}
		return {
			name,
			options,
		};
	}

	function createNode(value) {
		if (value instanceof Node) {
			return value;
		}
		if (value instanceof Template) {
			return value.render();
		}
		return document.createTextNode(getString(value));
	}
	function createNodes(html) {
		const element = document.createElement('template');
		element.innerHTML = html;
		const fragment = element.content.cloneNode(true);
		const scripts = Array.from(fragment.querySelectorAll('script'));
		for (const script of scripts) {
			script.remove();
		}
		fragment.normalize();
		return fragment;
	}
	function getNodes(value) {
		const array = Array.isArray(value) ? value : [value];
		return array
			.filter(item => item instanceof Node)
			.map(item =>
				item instanceof DocumentFragment ? Array.from(item.childNodes) : [item],
			);
	}
	function mapAttributes(element, expressions) {
		const attributes = Array.from(element.attributes);
		for (const attribute of attributes) {
			const {name, value} = attribute;
			const expression =
				value === comment ? expressions.values[expressions.index++] : undefined;
			const badAttribute =
				onAttributeExpression.test(name) ||
				(sourceAttributeNameExpression.test(name) &&
					sourceAttributeValueExpression.test(value));
			if (
				badAttribute ||
				!(expression instanceof Expression) ||
				!(element instanceof HTMLElement || element instanceof SVGElement)
			) {
				if (badAttribute) {
					element.removeAttribute(name);
				}
				continue;
			}
			if (name.startsWith('@')) {
				addEvent(element, attribute, expression);
			} else {
				observeAttribute(element, attribute, expression);
			}
		}
	}
	function mapNodes(data, template, node) {
		const {expressions} = data.get(template);
		const children = Array.from(node.childNodes);
		for (const child of children) {
			if (child.nodeType === 8 && child.nodeValue === blixt) {
				setNode(child, expressions.values[expressions.index++]);
				continue;
			}
			if (child instanceof Element) {
				mapAttributes(child, expressions);
			}
			if (child.hasChildNodes()) {
				mapNodes(data, template, child);
			}
		}
		return node;
	}
	function replaceNodes(from, to, set) {
		const items = (from ?? []).flat();
		for (const item of items) {
			if (items.indexOf(item) === 0) {
				item.before(...to.flat());
			}
			item.remove();
		}
		return set ? to : undefined;
	}
	function setNode(comment, value) {
		if (value instanceof Expression) {
			observeContent(comment, value);
		} else {
			comment.replaceWith(
				...getNodes(value instanceof Template ? value.render() : value).flat(),
			);
		}
	}

	class Expression {
		get value() {
			return this.callback;
		}
		constructor(callback) {
			this.callback = callback;
		}
	}
	class Template {
		/**
		 * Creates a template
		 * @param {TemplateStringsArray} strings
		 * @param {...any} expressions
		 */
		constructor(strings, expressions) {
			templateData.set(this, {
				strings,
				expressions: {
					index: 0,
					original: expressions ?? [],
					values: [],
				},
			});
		}
		/**
		 * Renders a template, on its own or for a parent
		 * @param {ParentNode=} parent
		 * @returns {Node}
		 */
		render(parent) {
			const value = toString(this);
			const rendered = createNodes(value);
			const mapped = mapNodes(templateData, this, rendered);
			parent?.append(mapped);
			return parent ?? mapped;
		}
	}
	/**
	 * Creates a template
	 */
	function template(strings, ...expressions) {
		return new Template(strings, expressions);
	}
	function toString(template) {
		const {strings, expressions} = templateData.get(template);
		function express(value, expression) {
			const isFunction = typeof expression === 'function';
			if (
				isFunction ||
				expression instanceof Node ||
				expression instanceof Template
			) {
				expressions.values.push(
					isFunction ? new Expression(expression) : expression,
				);
				return value + comment;
			}
			if (Array.isArray(expression)) {
				let expressed = '';
				for (const exp of expression) {
					expressed += express('', exp);
				}
				return value + expressed;
			}
			return value + getString(expression);
		}
		let html = '';
		// eslint-disable-next-line unicorn/no-for-loop
		for (let index = 0; index < strings.length; index += 1) {
			const value = strings[index];
			const expression = expressions.original[index];
			html += expression === undefined ? value : express(value, expression);
		}
		return html;
	}

	exports.Template = Template;
	exports.isStore = isStore;
	exports.observe = observe;
	exports.store = store;
	exports.subscribe = subscribe;
	exports.template = template;
	exports.unsubscribe = unsubscribe;

	return exports;
})({});

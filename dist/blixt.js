// src/helpers.js
var keyTypes = /* @__PURE__ */ new Set(['number', 'string']);
var period = '.';
function getKey(prefix, property) {
	return [prefix, property].filter(value => isKey(value)).join(period);
}
function getEventData(attribute) {
	let name = attribute.slice(1);
	const options = {
		passive: true,
	};
	if (name.includes(':')) {
		const [event, ...items] = name.split(':');
		name = event;
		options.capture = items.includes('capture');
		options.once = items.includes('once');
		options.passive = !items.includes('active');
	}
	return {
		name,
		options,
	};
}
function getValue(data2, key) {
	if (typeof data2 !== 'object') {
		return data2;
	}
	const keyAsString = String(key);
	if (!keyAsString.includes(period)) {
		return data2[keyAsString];
	}
	const parts = keyAsString.split(period);
	let value = data2;
	for (const part of parts) {
		value = value?.[part];
	}
	return value;
}
function isKey(value) {
	return keyTypes.has(typeof value);
}

// src/store.js
var observers = /* @__PURE__ */ new Map();
var proxies = /* @__PURE__ */ new WeakMap();
var stateKey = '__state';
var subscriptions = /* @__PURE__ */ new WeakMap();
var State = class {};
function createStore(data2, state, prefix) {
	if (isStore(data2)) {
		return data2;
	}
	const isArray = Array.isArray(data2);
	const isParent = !(state instanceof State);
	const proxyState = isParent ? new State() : state;
	const proxyValue = transformData(proxyState, prefix, data2, isArray);
	const proxy = new Proxy(
		proxyValue,
		{
			get(target, property) {
				if (property === stateKey) {
					return proxyState;
				}
				observeKey(proxyState, getKey(prefix, property));
				const value = Reflect.get(target, property);
				if (isArray && property in Array.prototype) {
					return handleArray({
						prefix,
						value,
						array: proxyValue,
						callback: property,
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
						properties === void 0 ? prefix : getKey(prefix, property),
						properties ?? [property],
						values ?? [oldValue],
					);
				}
				return setValue;
			},
		},
	);
	Object.defineProperty(
		proxy,
		stateKey,
		{
			value: proxyState,
			writable: false,
		},
	);
	if (isParent) {
		proxies.set(proxyState, proxy);
		subscriptions.set(proxyState, /* @__PURE__ */ new Map());
	}
	return proxy;
}
function emit(state, prefix, properties, values) {
	const proxy = proxies.get(state);
	if (proxy === void 0) {
		return;
	}
	const keys = properties.map(property => getKey(prefix, property));
	const origin = properties.length > 1 ? prefix : keys[0];
	if (prefix !== void 0) {
		const parts = prefix.split('.');
		keys.push(
			...parts.map((_, index) => parts.slice(0, index + 1).join('.')).reverse(),
		);
	}
	for (const key of keys) {
		const callbacks = subscriptions.get(state)?.get(key);
		if (callbacks === void 0) {
			continue;
		}
		const emitOrigin = key === origin ? void 0 : origin;
		const newValue = getValue(proxy, key);
		const oldValue = values[keys.indexOf(key)] ?? void 0;
		for (const callback of callbacks) {
			callback(newValue, oldValue, emitOrigin);
		}
	}
}
function handleArray(parameters) {
	const {array, callback, state, prefix, value} = parameters;
	function synthetic(...args) {
		const oldArray = array.slice(0);
		const result = Array.prototype[callback].call(array, ...args);
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
				synthetic(start, remove, ...transformData(state, prefix, items, true));
		}
		default: {
			return value;
		}
	}
}
function isStore(value) {
	return value?.[stateKey] instanceof State;
}
function observe(callback, after) {
	const expressive = typeof callback.run === 'function';
	const hasAfter = typeof after === 'function';
	const id = Symbol(callback);
	const queue = () => {
		if (frame !== null) {
			cancelAnimationFrame(frame);
		}
		frame = requestAnimationFrame(() => {
			frame = null;
			run();
		});
	};
	let current = observers.get(id) ?? /* @__PURE__ */ new Map();
	let frame = null;
	function run() {
		observers.set(id, /* @__PURE__ */ new Map());
		const value = expressive ? callback.run() : callback();
		const observed = observers.get(id) ?? /* @__PURE__ */ new Map();
		for (const [proxy, keys] of current.entries()) {
			const newKeys = observed.get(proxy) ?? /* @__PURE__ */ new Set();
			for (const key of keys) {
				if (!newKeys.has(key)) {
					unsubscribe(proxy, key, queue);
				}
			}
		}
		for (const [proxy, keys] of observed.entries()) {
			for (const key of keys) {
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
	if (proxy === void 0) {
		return;
	}
	for (const map of observers.values()) {
		const keys = map.get(proxy);
		if (keys === void 0) {
			map.set(proxy, /* @__PURE__ */ new Set([key]));
		}
		else {
			keys.add(key);
		}
	}
}
function store(data2) {
	if (typeof data2 !== 'object') {
		throw new TypeError('Data must be an object');
	}
	return createStore(data2);
}
function subscribe(store2, key, callback) {
	validateSubscription(store2, key, callback);
	const stored = subscriptions.get(store2?.[stateKey]);
	if (stored === void 0) {
		return;
	}
	const keyAsString = String(key);
	const subscribers = stored.get(keyAsString);
	if (subscribers === void 0) {
		stored.set(keyAsString, /* @__PURE__ */ new Set([callback]));
	}
	else if (!subscribers.has(callback)) {
		subscribers.add(callback);
	}
}
function transformData(state, prefix, data2, isArray) {
	const value = isArray ? [] : Object.create(data2, {});
	for (const key in data2) {
		if (key in data2) {
			value[key] = transformItem(state, prefix, key, data2[key]);
		}
	}
	return value;
}
function transformItem(state, prefix, key, value) {
	if (value === void 0 || value === null) {
		return value;
	}
	return typeof value === 'object'
		? createStore(value, state, getKey(prefix, key))
		: value;
}
function unsubscribe(store2, key, callback) {
	validateSubscription(store2, key, callback);
	const stored = subscriptions.get(store2?.[stateKey]);
	const subscribers = stored?.get(String(key));
	subscribers?.delete(callback);
}
function validateSubscription(store2, key, callback) {
	if (!isStore(store2)) {
		throw new TypeError('Store must be a reactive store');
	}
	if (!isKey(key)) {
		throw new TypeError('Key must be a number or string');
	}
	if (typeof callback !== 'function') {
		throw new TypeError('Callback must be a function');
	}
}

// src/template.js
var blixt = 'blixt';
var booleanAttributes = /* @__PURE__ */ new Set([
	'checked',
	'disabled',
	'inert',
	'multiple',
	'open',
	'readonly',
	'required',
	'selected',
]);
var comment = `<!--${blixt}-->`;
var data = /* @__PURE__ */ new WeakMap();
var Expression = class {
	/** @param {Function} callback */
	constructor(callback) {
		this.callback = callback;
	}
	/** @returns {any} */
	run() {
		return this.callback();
	}
};
var Template = class {
	/**
	 * @param {TemplateStringsArray} strings
	 * @param {...any} expressions
	 */
	constructor(strings, ...expressions) {
		data.set(
			this,
			{
				strings,
				expressions: {
					index: 0,
					original: expressions,
					values: [],
				},
			},
		);
	}
	/**
	 * @param {Element|undefined} parent
	 * @returns {Node|undefined}
	 */
	render(parent) {
		const value = toString(this);
		const rendered = createNodes(value);
		const mapped = mapNodes(this, rendered);
		parent?.append(mapped);
		return parent ?? mapped;
	}
};
function createNodes(html) {
	const element = document.createElement('template');
	element.innerHTML = html;
	const fragment = element.content.cloneNode(true);
	fragment.normalize();
	return fragment;
}
function mapAttributes(element, expressions) {
	const attributes = Array.from(element.attributes);
	for (const attribute of attributes) {
		if (attribute.value !== comment) {
			continue;
		}
		const expression = expressions.values[expressions.index++];
		if (!(expression instanceof Expression)) {
			continue;
		}
		if (attribute.name.startsWith('@')) {
			setEvent(element, attribute.name, expression);
		}
		else {
			setAttribute(element, attribute.name, expression);
		}
	}
}
function mapNodes(template2, node) {
	const {expressions} = data.get(template2) ?? {};
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
			mapNodes(template2, child);
		}
	}
	return node;
}
function setAttribute(element, attribute, expression) {
	const isBoolean = booleanAttributes.has(attribute);
	if (isBoolean) {
		element.removeAttribute(attribute);
	}
	observe(
		expression,
		value => {
			if (isBoolean) {
				element[attribute] =
					typeof value === 'boolean' ? value : element[attribute];
				return;
			}
			if (attribute === 'value') {
				element.value = value;
			}
			if (value === void 0 || value === null) {
				element.removeAttribute(attribute);
			}
			else {
				element.setAttribute(attribute, value);
			}
		},
	);
}
function setEvent(element, attribute, expression) {
	const event = getEventData(attribute);
	element.addEventListener(event.name, expression.callback, event.options);
	element.removeAttribute(attribute);
}
function setExpression(comment2, expression) {
	function replace(from, to, set) {
		for (const item of from ?? []) {
			if (from.indexOf(item) === 0) {
				item.replaceWith(...to);
			}
			else {
				item.remove();
			}
		}
		current = set ? to : null;
	}
	let current = null;
	observe(
		expression,
		value => {
			if (value === void 0 || value === null) {
				replace(current, [comment2], false);
				return;
			}
			if (Array.isArray(value)) {
				return;
			}
			let node = value instanceof Template ? value.render() : value;
			if (
				current?.length === 1
				&& current[0] instanceof Text
				&& !(node instanceof Node)
			) {
				if (current[0].textContent !== value) {
					current[0].textContent = value;
				}
				return;
			}
			if (!(node instanceof Node)) {
				node = document.createTextNode(node);
			}
			replace(
				current ?? [comment2],
				node instanceof DocumentFragment ? [...node.childNodes] : [node],
				true,
			);
		},
	);
}
function setNode(comment2, expression) {
	if (expression instanceof Expression) {
		setExpression(comment2, expression);
	}
	else {
		comment2.replaceWith(
			expression instanceof Node ? expression : expression.render(),
		);
	}
}
function template(strings, ...expressions) {
	return new Template(strings, ...expressions);
}
function toString(template2) {
	const {expressions, strings} = data.get(template2);
	function express(value, expression) {
		const isFunction = typeof expression === 'function';
		if (
			isFunction
			|| expression instanceof Node
			|| expression instanceof Template
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
		return value + expression;
	}
	let html = '';
	for (let index = 0; index < strings.length; index += 1) {
		const value = strings[index];
		const expression = expressions.original[index];
		html += expression === void 0 ? value : express(value, expression);
	}
	return html;
}
export {isStore, observe, store, subscribe, template, unsubscribe};

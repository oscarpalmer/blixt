var Blixt = (() => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all)
			__defProp(target, name, {get: all[name], enumerable: true});
	};
	var __copyProps = (to, from, except, desc) => {
		if ((from && typeof from === 'object') || typeof from === 'function') {
			for (let key of __getOwnPropNames(from))
				if (!__hasOwnProp.call(to, key) && key !== except)
					__defProp(to, key, {
						get: () => from[key],
						enumerable:
							!(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
					});
		}
		return to;
	};
	var __toCommonJS = mod =>
		__copyProps(__defProp({}, '__esModule', {value: true}), mod);

	// src/index.js
	var src_exports = {};
	__export(src_exports, {
		isStore: () => isStore,
		store: () => store,
		subscribe: () => subscribe,
		template: () => template,
		unsubscribe: () => unsubscribe,
	});

	// src/helpers.js
	var keyTypes = /* @__PURE__ */ new Set(['number', 'string', 'symbol']);
	var period = '.';
	function getKey(prefix, property) {
		return [prefix, property].filter(value => isKey(value)).join(period);
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
	var stateKey = '__state';
	var proxies = /* @__PURE__ */ new WeakMap();
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
		const proxy = new Proxy(proxyValue, {
			get(target, property) {
				if (property === stateKey) {
					return proxyState;
				}
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
				const set = Reflect.set(
					target,
					property,
					transformItem(proxyState, prefix, property, value),
				);
				if (set) {
					emit(proxyState, prefix, [property]);
				}
				return set;
			},
		});
		Object.defineProperty(proxy, stateKey, {
			value: proxyState,
			writable: false,
		});
		if (isParent) {
			proxies.set(proxyState, proxy);
			subscriptions.set(proxyState, /* @__PURE__ */ new Map());
		}
		return proxy;
	}
	function emit(state, prefix, properties) {
		const proxy = proxies.get(state);
		if (proxy === void 0) {
			return;
		}
		const keys = properties.map(property => getKey(prefix, property));
		if (prefix !== void 0) {
			const parts = prefix.split('.');
			keys.push(
				...parts
					.map((_, index) => parts.slice(0, index + 1).join('.'))
					.reverse(),
			);
		}
		for (const key of keys) {
			const callbacks = subscriptions.get(state)?.get(key);
			if (callbacks === void 0) {
				continue;
			}
			const value = getValue(proxy, key);
			for (const callback of callbacks) {
				callback(value, keys.indexOf(key) > 0 ? keys[0] : void 0);
			}
		}
	}
	function handleArray(parameters) {
		const {array, callback, state, prefix, value} = parameters;
		function synthetic(...args) {
			const result = Array.prototype[callback].call(array, ...args);
			emit(
				state,
				prefix,
				array.map((_, index) => index),
			);
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
				return value;
			}
		}
	}
	function isStore(value) {
		return value?.[stateKey] instanceof State;
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
		const callbacks = stored.get(keyAsString);
		if (callbacks === void 0) {
			stored.set(keyAsString, [callback]);
		} else if (!callbacks.includes(callback)) {
			callbacks.push(callback);
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
		return typeof value === 'object'
			? createStore(value, state, getKey(prefix, key))
			: value;
	}
	function unsubscribe(store2, key, callback) {
		validateSubscription(store2, key, callback);
		const stored = subscriptions.get(store2?.[stateKey]);
		const callbacks = stored?.get(String(key));
		const index = callbacks?.indexOf(callback) ?? -1;
		if (index > -1) {
			callbacks.splice(index, 1);
		}
	}
	function validateSubscription(store2, key, callback) {
		if (!isStore(store2)) {
			throw new TypeError('Store must be a reactive store');
		}
		if (!isKey(key)) {
			throw new TypeError('Key must be a number, string, or symbol');
		}
		if (typeof callback !== 'function') {
			throw new TypeError('Callback must be a function');
		}
	}

	// src/template.js
	var data = /* @__PURE__ */ new WeakMap();
	var Template = class {
		/**
		 * @param {TemplateStringsArray} strings
		 * @param {...any} expressions
		 */
		constructor(strings, ...expressions) {
			data.set(this, {
				expressions,
				strings,
			});
		}
		/**
		 * @param {Element|undefined} parent
		 * @returns {Node|undefined}
		 */
		render(parent) {
			const value = toString(this);
			const rendered = createNodes(value);
			if (rendered === void 0) {
				return parent ?? void 0;
			}
			parent?.append(rendered);
			return parent ?? rendered;
		}
	};
	function createNodes(html) {
		if (html === void 0) {
			return void 0;
		}
		const element = document.createElement('template');
		element.innerHTML = html;
		const fragment = element.content.cloneNode(true);
		fragment.normalize();
		return fragment;
	}
	function template(strings, ...expressions) {
		return new Template(strings, ...expressions);
	}
	function toString(template2) {
		const {expressions, strings} = data.get(template2) ?? {};
		if (expressions === void 0 || strings === void 0) {
			return void 0;
		}
		let html = '';
		for (const value of strings) {
			const index = strings.indexOf(value);
			const expression = expressions[index];
			if (typeof expression === 'function') {
				html += value + expression();
				continue;
			}
			html += Array.isArray(expression)
				? value + expression.join('')
				: value + String(expression ?? '');
		}
		return html;
	}
	return __toCommonJS(src_exports);
})();

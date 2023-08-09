var Blixt = (() => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name2 in all)
			__defProp(target, name2, {get: all[name2], enumerable: true});
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
		name: () => name,
		store: () => store,
	});

	// src/store.js
	var stateKey = '__state';
	var State = class {};
	function createStore(data, state) {
		if (isStore(data)) {
			return data;
		}
		const isArray = Array.isArray(data);
		const proxyState = state instanceof State ? state : new State();
		const proxyValue = transformData(data, proxyState, isArray);
		const proxy = new Proxy(proxyValue, {
			get(target, property) {
				if (property === stateKey) {
					return proxyState;
				}
				const value = Reflect.get(target, property);
				if (isArray && property in Array.prototype) {
					return handleArray(proxyValue, property, value, proxyState);
				}
				return value;
			},
			has(target, property) {
				return property === stateKey ? true : Reflect.has(target, property);
			},
			set(target, property, value) {
				return Reflect.set(target, property, transformItem(value, proxyState));
			},
		});
		Object.defineProperty(proxy, stateKey, {
			value: proxyState,
			writable: false,
		});
		return proxy;
	}
	function handleArray(array, callback, value, state) {
		function synthetic(...args) {
			return Array.prototype[callback].call(array, ...args);
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
				return (...items) => synthetic(...transformData(items, state, true));
			}
			case 'splice': {
				return (start, remove, ...items) =>
					synthetic(start, remove, ...transformData(items, state, true));
			}
			default: {
				return value;
			}
		}
	}
	function isStore(value) {
		return value?.[stateKey] instanceof State;
	}
	function store(data) {
		if (typeof data !== 'object') {
			throw new TypeError('Data must be an object');
		}
		return createStore(data);
	}
	function transformData(data, state, isArray) {
		const value = isArray ? [] : Object.create(data, {});
		for (const key in data) {
			if (key in data) {
				value[key] = transformItem(data[key], state);
			}
		}
		return value;
	}
	function transformItem(item, state) {
		return typeof item === 'object' ? createStore(item, state) : item;
	}

	// src/template.js
	var name = 'template';
	return __toCommonJS(src_exports);
})();

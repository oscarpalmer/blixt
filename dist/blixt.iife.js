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
		const proxyState = state instanceof State ? state : new State();
		const proxyValue = Object.create(data, {});
		for (const key in data) {
			const value = data[key];
			proxyValue[key] =
				typeof value === 'object' ? createStore(value, proxyState) : value;
		}
		const proxy = new Proxy(proxyValue, {
			get(target, property) {
				if (property === stateKey) {
					return proxyState;
				}
				return Reflect.get(target, property);
			},
			has(target, property) {
				return Reflect.has(target, property);
			},
			set(target, property, value) {
				return Reflect.set(
					target,
					property,
					typeof value === 'object' ? createStore(value, proxyState) : value,
				);
			},
		});
		Object.defineProperty(proxy, stateKey, {
			value: proxyState,
			writable: false,
		});
		return proxy;
	}
	function isStore(value) {
		return value?.[stateKey] instanceof State;
	}
	function store(data) {
		if (typeof data !== 'object') {
			throw new TypeError('Data must be an object');
		}
		return isStore(data) ? data : createStore(data);
	}

	// src/template.js
	var name = 'template';
	return __toCommonJS(src_exports);
})();

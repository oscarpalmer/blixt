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
export {isStore, name, store};

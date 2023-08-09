import {getKey, getValue} from './helpers.js';

const stateKey = '__state';

/** @type {WeakMap<State, ProxyConstructor>} */
const proxies = new WeakMap();

/** @type {WeakMap<State, Map<string, Array<() => void>>} */
const subscriptions = new WeakMap();

class State {}

function createStore(data, state, prefix) {
	if (isStore(data)) {
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

			const value = Reflect.get(target, property);

			if (isArray && property in Array.prototype) {
				return handleArray(state, prefix, property, value, proxyValue);
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
		subscriptions.set(proxyState, new Map());
	}

	return proxy;
}

function emit(state, prefix, properties) {
	const proxy = proxies.get(state);

	if (proxy === undefined) {
		return;
	}

	const keys = properties.map(property => getKey(prefix, property));

	if (prefix !== undefined) {
		const parts = prefix.split('.');

		keys.push(
			...parts.map((_, index) => parts.slice(0, index + 1).join('.')).reverse(),
		);
	}

	for (const key of keys) {
		const callbacks = subscriptions.get(state)?.get(key);

		if (callbacks === undefined) {
			continue;
		}

		const value = getValue(proxy, key);

		for (const callback of callbacks) {
			callback(value, keys.indexOf(key) > 0 ? keys[0] : undefined);
		}
	}
}

function handleArray(state, prefix, callback, value, array) {
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
				synthetic(start, remove, ...transformData(state, prefix, items, true));
		}

		default: {
			return value;
		}
	}
}

export function isStore(value) {
	return value?.[stateKey] instanceof State;
}

export function store(data) {
	if (typeof data !== 'object') {
		throw new TypeError('Data must be an object');
	}

	return createStore(data);
}

export function subscribe(store, key, callback) {
	const stored = subscriptions.get(store[stateKey]);

	if (stored === undefined) {
		return;
	}

	const callbacks = stored.get(key);

	if (callbacks === undefined) {
		stored.set(key, [callback]);
	} else if (!callbacks.includes(callback)) {
		callbacks.push(callback);
	}
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
	return typeof value === 'object'
		? createStore(value, state, getKey(prefix, key))
		: value;
}

export function unsubscribe(store, key, callback) {
	const stored = subscriptions.get(store[stateKey]);
	const callbacks = stored?.get(key);
	const index = callbacks?.indexOf(callback) ?? -1;

	if (index > -1) {
		callbacks.splice(index, 1);
	}
}

import {getKey, getValue, isKey} from './helpers.js';

/** @typedef {{[index: number]: any; [key: string]: any; [sym: symbol]: any}} Data */

/**
 * @typedef ArrayParameters
 * @property {Array} array
 * @property {string} callback
 * @property {State} state
 * @property {string} prefix
 * @property {any} value
 */

/** @typedef {number|string|symbol} Key */

/**
 * @typedef {{[K in keyof T]: T[K] extends Data ? Store<T[K]> : T[K]} & Data} Store<T>
 * @template T
 */

/**
 * @callback Subscriber
 * @param {any} newValue
 * @param {any=} oldValue
 * @param {string=} origin
 * @returns {void}
 */

const stateKey = '__state';

/** @type {WeakMap<State, ProxyConstructor>} */
const proxies = new WeakMap();

/** @type {WeakMap<State, Map<string, Array<() => void>>} */
const subscriptions = new WeakMap();

class State {}

/**
 * @template {Data} T
 * @param {T} data
 * @param {State|undefined} state
 * @param {Key|undefined} prefix
 * @returns {Store<T>}
 */
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
				let properties, values;

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
					properties === undefined ? prefix : `${prefix}.${property}`,
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

/**
 * @param {State} state
 * @param {Key|undefined} prefix
 * @param {Key[]} properties
 * @param {any[]} values
 * @returns {void}
 */
function emit(state, prefix, properties, values) {
	const proxy = proxies.get(state);

	if (proxy === undefined) {
		return;
	}

	const keys = properties.map(property => getKey(prefix, property));

	const origin = properties.length > 1 ? prefix : keys[0];

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

		const index = keys.indexOf(key);
		const value = getValue(proxy, key);

		for (const callback of callbacks) {
			callback(
				value,
				values[index] ?? undefined,
				key !== origin ? origin : undefined,
			);
		}
	}
}

/**
 * @param {ArrayParameters} parameters
 * @returns {any}
 */
function handleArray(parameters) {
	const {array, callback, state, prefix, value} = parameters;

	function synthetic(...args) {
		const oldArray = array.slice(0);

		const result = Array.prototype[callback].call(array, ...args);

		const properties = [];
		const values = [];

		for (let index = 0; index < oldArray.length; index += 1) {
			if (oldArray[index] !== array[index]) {
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

/**
 * Is the value a reactive store?
 * @param {any} value
 * @returns {boolean}
 */
export function isStore(value) {
	return value?.[stateKey] instanceof State;
}

/**
 * Creates a reactive store
 * @template {Data} T
 * @param {T} data
 * @returns {Store<T>}
 */
export function store(data) {
	if (typeof data !== 'object') {
		throw new TypeError('Data must be an object');
	}

	return createStore(data);
}

/**
 * Subscribes to value changes for a key in a store
 * @template {Data} T
 * @param {Store<T>} store
 * @param {Key} key
 * @param {Subscriber} callback
 * @returns {void}
 */
export function subscribe(store, key, callback) {
	validateSubscription(store, key, callback);

	const stored = subscriptions.get(store?.[stateKey]);

	if (stored === undefined) {
		return;
	}

	const keyAsString = String(key);
	const callbacks = stored.get(keyAsString);

	if (callbacks === undefined) {
		stored.set(keyAsString, [callback]);
	} else if (!callbacks.includes(callback)) {
		callbacks.push(callback);
	}
}

/**
 * @param {State} state
 * @param {Key|undefined} prefix
 * @param {object} data
 * @param {boolean} isArray
 * @returns {void}
 */
function transformData(state, prefix, data, isArray) {
	const value = isArray ? [] : Object.create(data, {});

	for (const key in data) {
		if (key in data) {
			value[key] = transformItem(state, prefix, key, data[key]);
		}
	}

	return value;
}

/**
 * @param {State} state
 * @param {Key|undefined} prefix
 * @param {Key} key
 * @param {any} value
 * @returns {void}
 */
function transformItem(state, prefix, key, value) {
	return typeof value === 'object'
		? createStore(value, state, getKey(prefix, key))
		: value;
}

/**
 * Unsubscribes from value changes for a key in a store
 * @template {Data} T
 * @param {Store<T>} store
 * @param {Key} key
 * @param {Subscriber} callback
 */
export function unsubscribe(store, key, callback) {
	validateSubscription(store, key, callback);

	const stored = subscriptions.get(store?.[stateKey]);
	const callbacks = stored?.get(String(key));
	const index = callbacks?.indexOf(callback) ?? -1;

	if (index > -1) {
		callbacks.splice(index, 1);
	}
}

function validateSubscription(store, key, callback) {
	if (!isStore(store)) {
		throw new TypeError('Store must be a reactive store');
	}

	if (!isKey(key)) {
		throw new TypeError('Key must be a number, string, or symbol');
	}

	if (typeof callback !== 'function') {
		throw new TypeError('Callback must be a function');
	}
}

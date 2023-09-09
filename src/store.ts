import {type Key, getKey, getString, getValue} from './helpers';
import {observeKey} from './observer';

type ArrayParameters = {
	array: any[];
	callback: string;
	state: State;
	prefix: string;
	value: any;
};

export type Data = {[index: number]: any; [key: string]: any};

export type Store<T extends Data> = {
	[K in keyof T]: T[K] extends Data ? Store<T[K]> : T[K];
} & Data;

type Subscriber = (newValue: any, oldValue?: any, origin?: string) => void;

export const proxies = new WeakMap<State, ProxyConstructor>();

const stateKey = '__state';

const subscriptions = new WeakMap<State, Map<string, Set<Subscriber>>>();

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class State {}

function createStore<T extends Data>(
	data: T,
	state?: State,
	prefix?: string,
): Store<T> {
	if (isStore(data)) {
		return data as Store<T>;
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

			const value = Reflect.get(target, property) as unknown;

			if (isArray && property in Array.prototype) {
				return handleArray({
					value,
					array: proxyValue as any[],
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
			const oldValue = Reflect.get(target, property) as unknown;

			const newValue = transformItem(
				proxyState,
				prefix,
				property,
				value,
			) as unknown;

			const setValue = Reflect.set(target, property, newValue);

			if (setValue) {
				let properties;
				let values;

				if (isStore(oldValue)) {
					properties = [];
					values = [];

					const oldKeys = Object.keys(oldValue as Store<Data>);
					const newKeys = Object.keys(newValue as Store<Data>);

					for (const key of oldKeys) {
						if (
							(oldValue as Store<Data>)[key] !== (newValue as Store<Data>)[key]
						) {
							properties.push(key);
							values.push((oldValue as Store<Data>)[key]);
						}
					}

					for (const key of newKeys) {
						if (!(key in (oldValue as Store<Data>))) {
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
		proxies.set(proxyState, proxy as never);
		subscriptions.set(proxyState, new Map());
	}

	return proxy as Store<T>;
}

function emit(
	state: State,
	prefix: string | undefined,
	properties: Key[],
	values: any[],
): void {
	const proxy = proxies.get(state);

	const keys = properties.map(property => getKey(prefix, property));

	const origin = properties.length > 1 ? prefix : keys[0];

	if (prefix !== undefined) {
		const parts = prefix.split('.');

		keys.push(
			...parts
				.map((_: any, index: number) => parts.slice(0, index + 1).join('.'))
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

		const newValue = getValue(proxy, key) as unknown;
		const oldValue = (values[keys.indexOf(key)] ?? undefined) as unknown;

		for (const callback of callbacks) {
			callback(newValue, oldValue, emitOrigin);
		}
	}
}

function handleArray(parameters: ArrayParameters): unknown {
	const {array, callback, state, prefix} = parameters;

	function synthetic(...args: any[]) {
		const oldArray = array.slice(0);

		const result = Array.prototype[callback].call(array, ...args) as unknown;

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
			return (...items: any[]) =>
				synthetic(...(transformData(state, prefix, items, true) as unknown[]));
		}

		case 'splice': {
			return (start: number, remove: number, ...items: any[]) =>
				synthetic(
					start,
					remove,
					...(transformData(state, prefix, items, true) as unknown[]),
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
export function isStore(value: any): boolean {
	return (value as Record<string, any>)?.[stateKey] instanceof State;
}

/**
 * Creates a reactive store
 * @template {Data} T
 * @param {T} data
 * @returns {Store<T>}
 */
export function store<T extends Data>(data: T): Store<T> {
	if (typeof data !== 'object') {
		throw new TypeError('Data must be an object');
	}

	return createStore(data);
}

/**
 * Subscribes to value changes for a key in a store
 * @template {Data} T
 * @param {Store<T>} store
 * @param {number|string|symbol} key
 * @param {(newValue: any, oldValue?: any, origin?: string) => void} callback
 * @returns {void}
 */
export function subscribe<T extends Data>(
	store: Store<T>,
	key: Key,
	callback: Subscriber,
): void {
	const stored = subscriptions.get(store?.[stateKey] as State);

	if (stored === undefined) {
		return;
	}

	const keyAsString = getString(key);
	const subscribers = stored.get(keyAsString);

	if (subscribers === undefined) {
		stored.set(keyAsString, new Set([callback]));
	} else if (!subscribers.has(callback)) {
		subscribers.add(callback);
	}
}

function transformData(
	state: State,
	prefix: Key | undefined,
	data: any[] | Record<string, any>,
	isArray: boolean,
): any[] | Record<string, any> {
	const value = (isArray ? [] : Object.create(data, {})) as Record<
		number | string,
		any
	>;

	for (const key in data) {
		if (key in data) {
			value[key] = transformItem(
				state,
				prefix,
				key,
				(data as Record<string, any>)[key],
			) as unknown;
		}
	}

	return value;
}

function transformItem(
	state: State,
	prefix: Key | undefined,
	key: Key,
	value: any,
): any {
	if (value === undefined || value === null) {
		return value;
	}

	return typeof value === 'object'
		? createStore(value as never, state, getKey(prefix, key))
		: value;
}

/**
 * Unsubscribes from value changes for a key in a store
 * @template {Data} T
 * @param {Store<T>} store
 * @param {number|string|symbol} key
 * @param {(newValue: any, oldValue?: any, origin?: string) => void} callback
 * @returns {void}
 */
export function unsubscribe<T extends Data>(
	store: Store<T>,
	key: Key,
	callback: Subscriber,
): void {
	const stored = subscriptions.get(store?.[stateKey] as State);
	const subscribers = stored?.get(String(key));

	subscribers?.delete(callback);
}

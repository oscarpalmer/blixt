import type {Data, Key, Subscriber} from '../models';
import {State} from '../models';
import {proxies, stateKey, storeSubscriptions} from '../data';
import {getKey, getString, isGenericObject} from '../helpers';
import {observeKey} from '../observer';
import {emit} from './emit';
import type {StoreSubscription} from './subscription';
import {subscribe} from './subscription';

type ArrayParameters = {
	array: unknown[];
	callback: string;
	state: State;
	prefix: string;
	value: unknown;
};

type ValueParameters = {
	newValue: unknown;
	oldValue: unknown;
	prefix: string | undefined;
	property: Key;
	state: State;
};

export function createStore(data: Data, state?: State, prefix?: string): Data {
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
			const newValue = transformItem(proxyState, prefix, property, value);

			return Reflect.set(target, property, newValue)
				? setValue({newValue, oldValue, prefix, property, state: proxyState})
				: false;
		},
	});

	Object.defineProperty(proxy, stateKey, {
		value: proxyState,
		writable: false,
	});

	if (isParent) {
		proxies.set(proxyState, proxy as never);
		storeSubscriptions.set(proxyState, new Map());
	}

	return proxy as Data;
}

function handleArray(parameters: ArrayParameters): unknown {
	const {array, callback, state, prefix} = parameters;

	function synthetic(...args: unknown[]): unknown {
		const oldArray = array.slice(0);

		const result = Array.prototype[callback as never].apply(
			array,
			args,
		) as unknown;

		const properties: number[] = [];
		const values: unknown[] = [];

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
			return (...items: unknown[]) =>
				synthetic(...(transformData(state, prefix, items, true) as unknown[]));
		}

		case 'splice': {
			return (start: number, remove: number, ...items: unknown[]) =>
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

function isStore(value: unknown): boolean {
	return (value as Record<string, unknown>)?.[stateKey] instanceof State;
}

function setValue(parameters: ValueParameters): boolean {
	const {newValue, oldValue, prefix, property, state} = parameters;

	let properties: string[] | undefined;
	let values: unknown[] | undefined;

	if (isStore(oldValue)) {
		properties = [];
		values = [];

		const oldKeys = Object.keys(oldValue as Data);
		const newKeys = Object.keys(newValue as Data);

		for (const key of oldKeys) {
			if ((oldValue as Data)[key] !== (newValue as Data)[key]) {
				properties.push(key);
				values.push((oldValue as Data)[key]);
			}
		}

		for (const key of newKeys) {
			if (!(key in (oldValue as Data))) {
				properties.push(key);
			}
		}
	}

	emit(
		state,
		properties === undefined ? prefix : getKey(prefix, property),
		properties ?? [property],
		values ?? [oldValue],
	);

	return true;
}

/**
 * Creates a reactive store
 * @template {Record<number | string, unknown>} T
 * @param {T} data Original data object
 * @returns {T} Reactive store
 */
export function store<T extends Data>(data: T): T {
	if (typeof data !== 'object') {
		throw new TypeError('Data must be an object');
	}

	return createStore(data) as T;
}

function transformData(
	state: State,
	prefix: Key | undefined,
	data: unknown[] | Record<string, unknown>,
	isArray: boolean,
): unknown[] | Record<string, unknown> {
	const value = (isArray ? [] : Object.create(data, {})) as Record<
		number | string,
		unknown
	>;

	for (const key in data) {
		if (key in data) {
			value[key] = transformItem(
				state,
				prefix,
				key,
				(data as Record<string, unknown>)[key],
			);
		}
	}

	return value;
}

function transformItem(
	state: State,
	prefix: Key | undefined,
	key: Key,
	value: unknown,
): unknown {
	return typeof value === 'object' && value !== null
		? createStore(value as never, state, getKey(prefix, key))
		: value;
}

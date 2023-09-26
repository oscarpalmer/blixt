import {stateKey, subscriptions} from '../data';
import {getString, isKey} from '../helpers';
import type {Data, Key, State, Store, Subscriber} from '../models';
import {isStore} from '.';

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
	validate(store, key, callback);

	const stored = subscriptions.get(store?.[stateKey] as State)!;

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
export function unsubscribe<T extends Data>(
	store: Store<T>,
	key: Key,
	callback: Subscriber,
): void {
	validate(store, key, callback);

	const stored = subscriptions.get(store?.[stateKey] as State);
	const subscribers = stored?.get(String(key));

	subscribers?.delete(callback);
}

function validate(store: unknown, key: unknown, callback: unknown): void {
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

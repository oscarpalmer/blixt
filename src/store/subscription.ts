import {stateKey, subscriptions} from '../data';
import {getString, isKey} from '../helpers';
import type {Data, Key, Store, Subscriber} from '../models';
import {State} from '../models';

export class Subscription implements Subscription {
	readonly callback: Subscriber;
	readonly key: string;
	readonly state: State;

	constructor(state: State, key: Key, callback: Subscriber) {
		if (!(state instanceof State)) {
			throw new TypeError('Store must be a store');
		}

		if (!isKey(key)) {
			throw new TypeError('Key must be a number, string, or symbol');
		}

		if (typeof callback !== 'function') {
			throw new TypeError('Callback must be a function');
		}

		const keyAsString = getString(key);

		this.callback = callback;
		this.key = keyAsString;
		this.state = state;

		const stored = subscriptions.get(state)!;
		const subs = stored.get(keyAsString);

		if (subs === undefined) {
			stored.set(keyAsString, new Set([callback]));
		} else if (!subs.has(callback)) {
			subs.add(callback);
		}
	}

	unsubscribe(): void {
		const stored = subscriptions.get(this.state)!;
		const subs = stored.get(this.key);

		subs?.delete(this.callback);
	}
}

/**
 * Subscribes to value changes for a key in a store
 * @template {Data} T
 * @param {Store<T>} store
 * @param {number|string|symbol} key
 * @param {(newValue: any, oldValue?: any, origin?: string) => void} callback
 * @returns {{unsubscribe(): void}}}
 */
export function subscribe<T extends Data>(
	store: Store<T>,
	key: Key,
	callback: Subscriber,
): Subscription {
	return new Subscription(store?.[stateKey] as State, key, callback);
}

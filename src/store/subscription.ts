import {stateKey, subscriptions} from '../data';
import {getString, isKey} from '../helpers';
import type {Data, Key, Store, Subscriber} from '../models';
import {State} from '../models';

type SubscriptionState = {
	callback: Subscriber;
	key: string;
	value: State;
};

const states = new WeakMap<StoreSubscription, SubscriptionState>();

export class StoreSubscription {
	get key(): string {
		return states.get(this)!.key;
	}

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

		states.set(this, {
			callback,
			key: keyAsString,
			value: state,
		});

		const stored = subscriptions.get(state)!;
		const subs = stored.get(keyAsString);

		if (subs === undefined) {
			stored.set(keyAsString, new Set([callback]));
		} else if (!subs.has(callback)) {
			subs.add(callback);
		}
	}

	resubscribe(): void {
		manage('add', this);
	}

	unsubscribe(): void {
		manage('remove', this);
	}
}

function manage(type: 'add' | 'remove', subscription: StoreSubscription): void {
	const state = states.get(subscription);

	if (state === undefined) {
		return;
	}

	const stored = subscriptions.get(state.value);
	const subscribers = stored?.get(subscription.key);

	if (
		type === 'add' &&
		subscribers !== undefined &&
		!subscribers.has(state.callback)
	) {
		subscribers.add(state.callback);
	} else if (type === 'remove') {
		subscribers?.delete(state.callback);
	}
}

/**
 * - Subscribes to value changes for a key in a store
 * - Returns a subscription that can be unsubscribed and resubscribed as needed
 * @template {Data} T
 * @param {Store<T>} store
 * @param {number|string|symbol} key
 * @param {(newValue: any, oldValue?: any, origin?: string) => void} callback
 * @returns {StoreSubscription}
 */
export function subscribe<T extends Data>(
	store: Store<T>,
	key: Key,
	callback: Subscriber,
): StoreSubscription {
	return new StoreSubscription(store?.[stateKey] as State, key, callback);
}

import {proxies} from '../data';
import {getString} from '../helpers';
import type {Data, Key, State, Store} from '../models';
import {subscribe, Subscription} from '../store/subscription';

const observers = new Map<symbol, Map<Store<Data>, Set<string>>>();

/**
 * Observes changes for properties used in a function
 * @param {() => any} callback
 * @param {{(value: any) => any}=} after
 * @returns {any}
 */
export function observe(callback: () => any, after?: (value: any) => any): any {
	if (typeof callback !== 'function') {
		throw new TypeError('Callback must be a function');
	}

	if (after !== undefined && typeof after !== 'function') {
		throw new TypeError('After-callback must be a function');
	}

	const hasAfter = typeof after === 'function';
	const id = Symbol(undefined);
	const subscriptions = new Set<Subscription>();

	const queue = () => {
		cancelAnimationFrame(frame!);

		frame = requestAnimationFrame(() => {
			frame = undefined;

			run();
		});
	};

	let current = observers.get(id) ?? new Map<Store<Data>, Set<Key>>();

	let frame: number | undefined;

	function run(): any {
		observers.set(id, new Map());

		const value = callback() as never;

		const observed = observers.get(id) ?? new Map<Store<Data>, Set<Key>>();

		const currentEntries = Array.from(current.entries());

		for (const [proxy, keys] of currentEntries) {
			const newKeys = observed.get(proxy) ?? new Set();

			for (const subscription of subscriptions) {
				if (keys.has(subscription.key) && !newKeys.has(subscription.key)) {
					subscription.unsubscribe();

					subscriptions.delete(subscription);
				}
			}
		}

		const observedEntries = Array.from(observed.entries());

		for (const [proxy, keys] of observedEntries) {
			const keysValues = Array.from(keys.values());

			for (const key of keysValues) {
				if (
					!Array.from(subscriptions).some(
						subscription => subscription.key === key,
					)
				) {
					subscriptions.add(subscribe(proxy, key, queue));
				}
			}
		}

		current = observed;

		return hasAfter ? after(value) : value;
	}

	return run();
}

export function observeKey(state: State, key: Key): void {
	const proxy = proxies.get(state)!;

	for (const [_, data] of observers) {
		const keys = data.get(proxy as never);

		if (keys === undefined) {
			data.set(proxy as never, new Set([getString(key)]));
		} else {
			keys.add(getString(key));
		}
	}
}

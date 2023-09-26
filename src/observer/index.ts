import {observers, proxies} from '../data';
import type {Data, Key, State, Store} from '../models';
import {subscribe, unsubscribe} from '../store/subscription';

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

			const keysValues = Array.from(keys.values());

			for (const key of keysValues) {
				if (!newKeys.has(key)) {
					unsubscribe(proxy, key, queue);
				}
			}
		}

		const observedEntries = Array.from(observed.entries());

		for (const [proxy, keys] of observedEntries) {
			const keysValues = Array.from(keys.values());

			for (const key of keysValues) {
				subscribe(proxy, key, queue);
			}
		}

		current = observed;

		return hasAfter ? after(value) : value;
	}

	return run();
}

export function observeKey(state: State, key: Key): void {
	const proxy = proxies.get(state)!;
	const values = Array.from(observers.values());

	for (const map of values) {
		const keys = map.get(proxy as never);

		if (keys === undefined) {
			map.set(proxy as never, new Set([key]));
		} else {
			keys.add(key);
		}
	}
}

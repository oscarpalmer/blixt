import {proxies, subscribe, unsubscribe} from './store.js';

/** @type {Map<symbol, Map<Store<Data>, Set<Key>>>} */
const observers = new Map();

/**
 * Observes changes for properties used in a function
 * @param {(...args: any[]) => any} callback
 * @param {{(value: any) => void}=} after
 * @returns {void}
 */
export function observe(callback, after) {
	const expressive = typeof callback.run === 'function';
	const hasAfter = typeof after === 'function';

	const id = Symbol(callback);

	const queue = () => {
		if (frame !== null) {
			cancelAnimationFrame(frame);
		}

		frame = requestAnimationFrame(() => {
			frame = null;

			run();
		});
	};

	/** @type {Map<Store<Data>, Set<Key>>} */
	let current = observers.get(id) ?? new Map();

	/** @type {number|null} */
	let frame = null;

	function run() {
		observers.set(id, new Map());

		const value = expressive ? callback.run() : callback();

		const observed = observers.get(id) ?? new Map();

		for (const [proxy, keys] of current.entries()) {
			const newKeys = observed.get(proxy) ?? new Set();

			for (const key of keys) {
				if (!newKeys.has(key)) {
					unsubscribe(proxy, key, queue);
				}
			}
		}

		for (const [proxy, keys] of observed.entries()) {
			for (const key of keys) {
				subscribe(proxy, key, queue);
			}
		}

		current = observed;

		return hasAfter ? after(value) : value;
	}

	return run();
}

/**
 * @param {State} state
 * @param {Key} key
 * @returns {void}
 */
export function observeKey(state, key) {
	const proxy = proxies.get(state);

	if (proxy === undefined) {
		return;
	}

	for (const map of observers.values()) {
		const keys = map.get(proxy);

		if (keys === undefined) {
			map.set(proxy, new Set([key]));
		}
		else {
			keys.add(key);
		}
	}
}

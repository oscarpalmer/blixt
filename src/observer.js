import {proxies, subscribe, unsubscribe} from './store.js';
import {Expression, Template} from './template.js';

const attributes = new Set([
	'checked',
	'disabled',
	'inert',
	'multiple',
	'open',
	'readonly',
	'required',
	'selected',
]);

/** @type {Map<symbol, Map<Store<Data>, Set<Key>>>} */
const observers = new Map();

/**
 * @param {Element} element
 * @param {Attr} attribute
 * @param {Expression} expression
 * @returns {void}
 */
export function observeAttribute(element, attribute, expression) {
	const {name} = attribute;

	const isBoolean = attributes.has(name);

	if (isBoolean) {
		element.removeAttribute(name);
	}

	observe(
		expression,
		value => {
			if (isBoolean) {
				if (typeof value === 'boolean') {
					element[name] = value;
				}

				return;
			}

			if (name === 'value') {
				element.value = value;
			}

			if (value === undefined || value === null) {
				element.removeAttribute(name);
			}
			else {
				element.setAttribute(name, value);
			}
		},
	);
}

/**
 * @param {Comment} comment
 * @param {Expression} expression
 * @returns {void}
 */
export function observeContent(comment, expression) {
	/**
	 * @param {Node[]} from
	 * @param {Node[]} to
	 * @param {boolean} set
	 */
	function replace(from, to, set) {
		for (const item of from ?? []) {
			if (from.indexOf(item) === 0) {
				item.replaceWith(...to);
			}
			else {
				item.remove();
			}
		}

		current = set ? to : null;
	}

	let current = null;

	observe(
		expression,
		value => {
			if (value === undefined || value === null) {
				replace(current, [comment], false);

				return;
			}

			// TODO: support arrays
			// TODO: smarter replace for chunks

			if (Array.isArray(value)) {
				return;
			}

			let node = value instanceof Template ? value.render() : value;

			if (
				current?.length === 1
				&& current[0] instanceof Text
				&& !(node instanceof Node)
			) {
				if (current[0].textContent !== value) {
					current[0].textContent = value;
				}

				return;
			}

			if (!(node instanceof Node)) {
				node = document.createTextNode(node);
			}

			replace(
				current ?? [comment],
				node instanceof DocumentFragment ? [...node.childNodes] : [node],
				true,
			);
		},
	);
}

/**
 * Observes changes for properties used in a function
 * @param {(...args: any[]) => any} callback
 * @param {{(value: any) => void}=} after
 * @returns {void}
 */
export function observe(callback, after) {
	const fn = callback instanceof Expression ? callback.value : callback;
	const hasAfter = typeof after === 'function';
	const id = Symbol(undefined);

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

		const value = fn();

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

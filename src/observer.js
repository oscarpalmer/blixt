import {proxies, subscribe, unsubscribe} from './store.js';
import {Expression} from './template.js';
import {createNode, getNodes, replaceNodes} from './helpers/dom.js';

const attributes = new Set([
	'checked',
	'disabled',
	'hidden',
	'inert',
	'multiple',
	'open',
	'readonly',
	'required',
	'selected',
]);

/** @type {Map<symbol, Map<Store<Data>, Set<import('./helpers/index.js').Key>>>} */
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
	const isClass = /^class\./i.test(name);
	const isStyle = /^style\./i.test(name);

	if (isBoolean || isClass || isStyle) {
		element.removeAttribute(name);
	}

	observe(expression, value => {
		if (isBoolean) {
			if (typeof value === 'boolean') {
				element[name] = value;
			}

			return;
		}

		if (isClass) {
			const classes = name.split('.').slice(1);

			if (value === true) {
				element.classList.add(...classes);
			} else {
				element.classList.remove(...classes);
			}

			return;
		}

		const remove = value === undefined || value === null;

		if (isStyle) {
			const [, property, suffix] = name.split('.');

			if (
				remove ||
				value === false ||
				(value === true && suffix === undefined)
			) {
				element.style.removeProperty(property);
			} else {
				element.style.setProperty(
					property,
					value === true ? suffix : `${value}${suffix ?? ''}`,
				);
			}

			return;
		}

		if (name === 'value') {
			element.value = value;
		}

		if (remove) {
			element.removeAttribute(name);
		} else {
			element.setAttribute(name, value);
		}
	});
}

/**
 * @param {Comment} comment
 * @param {Expression} expression
 * @returns {void}
 */
export function observeContent(comment, expression) {
	/** @type {Array<Node|Node[]>|null} */
	let current = null;
	let isText = false;

	observe(expression, value => {
		const isArray = Array.isArray(value);

		if (value === undefined || value === null || isArray) {
			isText = false;

			current =
				isArray && value.length > 0
					? updateArray(comment, current, value)
					: replaceNodes(current ?? [comment], [comment], false);

			return;
		}

		const node = createNode(value);

		if (isText && node instanceof Text) {
			if (current[0][0].textContent !== node.textContent) {
				current[0][0].textContent = node.textContent;
			}

			return;
		}

		isText = node instanceof Text;

		current = replaceNodes(current ?? [comment], getNodes(node), true);
	});
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
		} else {
			keys.add(key);
		}
	}
}

/**
 * @param {Comment} comment
 * @param {Array<Node[]>|null} current
 * @param {any[]} array
 * @returns {Array<Node[]>}
 */
function updateArray(comment, current, array) {
	return replaceNodes(
		current ?? [comment],
		array.map(item => createNode(item)),
		true,
	);
}

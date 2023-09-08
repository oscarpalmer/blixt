import {proxies, subscribe, unsubscribe} from './store';
import type {Data, State, Store} from './store';
import {type Expression} from './template';
import {getString, type Key} from './helpers';
import {createNode, getNodes, replaceNodes} from './helpers/dom';

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

const observers = new Map<symbol, Map<Store<Data>, Set<Key>>>();

export function observeAttribute(
	element: HTMLElement,
	attribute: Attr,
	expression: Expression,
): void {
	const {name} = attribute;

	const isBoolean = attributes.has(name);
	const isClass = /^class\./i.test(name);
	const isStyle = /^style\./i.test(name);

	if (isBoolean || isClass || isStyle) {
		element.removeAttribute(name);
	}

	observe(expression.value, (value: unknown) => {
		if (isBoolean) {
			if (typeof value === 'boolean') {
				(element as unknown as Record<string, unknown>)[name] = value;
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
					value === true ? suffix : `${getString(value)}${suffix ?? ''}`,
				);
			}

			return;
		}

		if (name === 'value') {
			(element as HTMLInputElement).value = getString(value);
		}

		if (remove) {
			element.removeAttribute(name);
		} else {
			element.setAttribute(name, getString(value));
		}
	});
}

export function observeContent(comment: Comment, expression: Expression): void {
	let current: Node[][] | undefined;
	let isText = false;

	observe(expression.value, (value: unknown) => {
		const isArray = Array.isArray(value);

		if (value === undefined || value === null || isArray) {
			isText = false;

			current =
				isArray && value.length > 0
					? updateArray(comment, current, value)
					: current === undefined
					? undefined
					: replaceNodes(current, [[comment]], false)!;

			return;
		}

		const node = createNode(value);

		if (current !== undefined && isText && node instanceof Text) {
			if (current[0][0].textContent !== node.textContent) {
				current[0][0].textContent = node.textContent;
			}

			return;
		}

		isText = node instanceof Text;

		current = replaceNodes(current ?? [[comment]], getNodes(node), true);
	});
}

/**
 * Observes changes for properties used in a function
 */
export function observe(
	callback: () => unknown,
	after: (value: unknown) => unknown,
): unknown {
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

	function run(): unknown {
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
	const proxy = proxies.get(state);

	if (proxy === undefined) {
		return;
	}

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

export function updateArray(
	comment: Comment,
	current: Node[][] | undefined,
	array: unknown[],
): Node[][] {
	return replaceNodes(
		current ?? [[comment]],
		getNodes(array.map(item => createNode(item))),
		true,
	)!;
}

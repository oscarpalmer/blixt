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

/**
 * Observes changes for properties used in a function
 * @param {() => any} callback
 * @param {{(value: any) => any}=} after
 * @returns {any}
 */
export function observe(callback: () => any, after?: (value: any) => any): any {
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

	if (isBoolean) {
		observeBooleanAttribute(element, name, expression);
	} else if (isClass) {
		observeClassAttribute(element, name, expression);
	} else if (isStyle) {
		observeStyleAttribute(element, name, expression);
	} else {
		observeValueAttribute(element, name, expression);
	}
}

function observeBooleanAttribute(
	element: HTMLElement,
	name: string,
	expression: Expression,
): void {
	observe(expression.value, (value: any) => {
		if (typeof value === 'boolean') {
			(element as Record<string, any>)[name] = value;
		}
	});
}

function observeClassAttribute(
	element: HTMLElement,
	name: string,
	expression: Expression,
): void {
	const classes = name
		.split('.')
		.slice(1)
		.map(name => name.trim())
		.filter(name => name.length > 0);

	if (classes.length === 0) {
		return;
	}

	observe(expression.value, (value: any) => {
		if (value === true) {
			element.classList.add(...classes);
		} else {
			element.classList.remove(...classes);
		}
	});
}

export function observeContent(comment: Comment, expression: Expression): void {
	let current: ChildNode[][] | undefined;
	let isText = false;

	observe(expression.value, (value: any) => {
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

function observeStyleAttribute(
	element: HTMLElement,
	name: string,
	expression: Expression,
): void {
	const [, first, second] = name.split('.');

	const property = first.trim();
	const suffix = second?.trim();

	if (property.length === 0 || (suffix !== undefined && suffix.length === 0)) {
		return;
	}

	observe(expression.value, (value: any) => {
		if (
			value === undefined ||
			value === null ||
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
	});
}

function observeValueAttribute(
	element: HTMLElement,
	name: string,
	expression: Expression,
): void {
	observe(expression.value, (value: any) => {
		if (name === 'value') {
			(element as HTMLInputElement).value = value as never;
		}

		if (value === undefined || value === null) {
			element.removeAttribute(name);
		} else {
			element.setAttribute(name, value as never);
		}
	});
}

export function updateArray(
	comment: Comment,
	current: ChildNode[][] | undefined,
	array: any[],
): ChildNode[][] {
	return replaceNodes(
		current ?? [[comment]],
		getNodes(array.map(item => createNode(item))),
		true,
	)!;
}

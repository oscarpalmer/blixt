import {nodeProperties, nodeSubscriptions} from '../data';
import type {EventExpression, Key} from '../models';
import type {ObservableSubscription} from '../observer';
import type {Expression} from '../template';

const keyTypes = new Set<string>(['number', 'string', 'symbol']);

export function compareArrayOrder(
	first: Key[],
	second: Key[],
): 'added' | 'dissimilar' | 'removed' {
	const target = first.length > second.length ? second : first;

	if (
		!(first.length > second.length ? first : second)
			.filter(key => target.includes(key))
			.every((key, index) => target[index] === key)
	) {
		return 'dissimilar';
	}

	return first.length > second.length ? 'removed' : 'added';
}

export function getKey(...parts: Array<Key | undefined>): string {
	return parts
		.filter(part => part !== undefined)
		.map(part => getString(part).trim())
		.filter(part => part.length > 0)
		.join('.');
}

export function getString(value: any): string {
	return typeof value === 'string' ? value : String(value);
}

export function getValue(data: any, key: string): any {
	if (typeof data !== 'object') {
		return data;
	}

	const parts = key.split('.');

	let value: unknown = data;

	for (const part of parts) {
		value = (value as Record<string, any>)?.[part];
	}

	return value;
}

export function isGenericObject(value: unknown): boolean {
	return Array.isArray(value) || value?.constructor?.name === 'Object';
}

export function isKey(value: unknown): boolean {
	return keyTypes.has(typeof value);
}

export function storeProperty(
	node: Node,
	name: string,
	value: Expression | EventExpression,
): void {
	const stored = nodeProperties.get(node);

	if (stored === undefined) {
		nodeProperties.set(node, new Map([[name, new Set([value as never])]]));
	} else {
		const named = stored.get(name);

		if (named === undefined) {
			stored.set(name, new Set([value as never]));
		} else {
			named.add(value as never);
		}
	}
}

export function storeSubscription(
	element: Node,
	subscription: ObservableSubscription,
): void {
	const subscriptions = nodeSubscriptions.get(element);

	if (subscriptions === undefined) {
		nodeSubscriptions.set(element, new Set([subscription]));
	} else if (!subscriptions.has(subscription)) {
		subscriptions.add(subscription);
	}
}

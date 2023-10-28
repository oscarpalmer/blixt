import {nodeSubscriptions} from '../data';
import type {Key} from '../models';
import type {ObservableSubscription} from '../observer';

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
		if (value === undefined) {
			return undefined;
		}

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

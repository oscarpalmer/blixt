import {getValue} from '@oscarpalmer/atoms';
import {proxies, storeSubscriptions} from '../data';
import type {Key, State} from '../models';
import {getKey} from '../helpers';

type Parameters = {
	key: string;
	keys: string[];
	origin: string | undefined;
	prefix: string | undefined;
	proxy: ProxyConstructor;
	state: State;
	values: unknown[];
};

export function emit(
	state: State,
	prefix: string | undefined,
	properties: Key[],
	values: unknown[],
): void {
	const proxy = proxies.get(state)!;

	const keys = properties.map(property => getKey(prefix, property));

	const origin = properties.length > 1 ? prefix : keys[0];

	if (prefix !== undefined) {
		const parts = prefix.split('.');

		keys.push(
			...parts
				.map((_: unknown, index: number) => parts.slice(0, index + 1).join('.'))
				.reverse(),
		);
	}

	for (const key of keys) {
		emitValue({key, keys, origin, prefix, proxy, state, values});
	}
}

function emitValue(parameters: Parameters): void {
	const {state, key, origin, proxy, keys, values} = parameters;

	const subscribers = storeSubscriptions.get(state)?.get(key);

	if (subscribers === undefined) {
		return;
	}

	const callbacks = Array.from(subscribers);

	const emitOrigin = key === origin ? undefined : origin;

	const newValue = getValue(proxy, key);
	const oldValue = (values[keys.indexOf(key)] ?? undefined) as unknown;

	for (const callback of callbacks) {
		callback(newValue, oldValue, emitOrigin);
	}
}

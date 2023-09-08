export type Key = number | string | symbol;

const period = '.';

export function getKey(...parts: Array<Key | undefined>): string {
	return parts
		.filter(part => part !== undefined)
		.map(part => getString(part).trim())
		.filter(part => part.length > 0)
		.join(period);
}

export function getString(value: unknown): string {
	return typeof value === 'string' ? value : String(value);
}

export function getValue(data: unknown, key: string): unknown {
	if (typeof data !== 'object') {
		return data;
	}

	const parts = key.split(period);

	let value: unknown = data;

	for (const part of parts) {
		value = (value as Record<string, unknown>)?.[part];
	}

	return value;
}

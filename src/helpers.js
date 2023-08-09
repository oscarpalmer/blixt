const keyTypes = new Set(['number', 'string']);
const period = '.';

export function getKey(prefix, property) {
	return [prefix, property]
		.filter(value => keyTypes.has(typeof value))
		.join(period);
}

export function getValue(data, key) {
	if (typeof data !== 'object') {
		return data;
	}

	if (!key.includes(period)) {
		return data[key];
	}

	const parts = key.split(period);

	let value = data;

	for (const part of parts) {
		value = value?.[part];
	}

	return value;
}

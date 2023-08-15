/**
 * @typedef EventData
 * @property {string} name
 * @property {AddEventListenerOptions} options
 */

/** @typedef {number|string} Key */

const keyTypes = new Set(['number', 'string']);
const period = '.';

/**
 * @param {Key|undefined} prefix
 * @param {Key} property
 * @returns {string}
 */
export function getKey(prefix, property) {
	return [prefix, property].filter(value => isKey(value)).join(period);
}

/**
 * @param {string} attribute
 * @returns {EventData}
 */
export function getEventData(attribute) {
	let name = attribute.slice(1);

	/** @type {AddEventListenerOptions} */
	const options = {
		passive: true,
	};

	if (name.includes(':')) {
		const [event, ...items] = name.split(':');

		name = event;

		options.capture = items.includes('capture');
		options.once = items.includes('once');
		options.passive = !items.includes('active');
	}

	return {
		name, options,
	};
}

/**
 * @param {any} data
 * @param {Key} key
 * @returns {any}
 */
export function getValue(data, key) {
	if (typeof data !== 'object') {
		return data;
	}

	const keyAsString = String(key);

	if (!keyAsString.includes(period)) {
		return data[keyAsString];
	}

	const parts = keyAsString.split(period);

	let value = data;

	for (const part of parts) {
		value = value?.[part];
	}

	return value;
}

/**
 * @param {any} value
 * @returns {boolean}
 */
export function isKey(value) {
	return keyTypes.has(typeof value);
}

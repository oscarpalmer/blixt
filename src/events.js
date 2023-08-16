/**
 * @typedef EventData
 * @property {string} name
 * @property {AddEventListenerOptions} options
 */

/**
 * @param {string} attribute
 * @returns {EventData}
 */
function get(attribute) {
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
		name,
		options,
	};
}

/**
 * @param {Element} element
 * @param {Attr} attribute
 * @param {Function} callback
 * @returns {void}
 */
export function handle(element, attribute, callback) {
	const event = get(attribute.name);

	element.addEventListener(event.name, callback, event.options);

	attribute.value = null;
}

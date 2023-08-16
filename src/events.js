/**
 * @typedef EventData
 * @property {string} name
 * @property {AddEventListenerOptions} options
 */

/**
 * @param {string} attribute
 * @returns {EventData}
 */
function getData(attribute) {
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
 * @param {import('./template.js').Expression} expression
 * @returns {void}
 */
export function handleEvent(element, attribute, expression) {
	const event = getData(attribute.name);

	element.addEventListener(event.name, expression.value, event.options);

	element.removeAttribute(attribute.name);
}

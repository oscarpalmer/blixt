import type {EventParameters} from '../models';
import type {Expression} from '../template';

export function addEvent(
	element: HTMLElement | SVGElement,
	attribute: Attr,
	expression: Expression,
) {
	const {name, options} = getEventParameters(attribute.name);

	element.addEventListener(name as never, expression.value as never, options);

	element.removeAttribute(attribute.name);
}

export function getEventParameters(attribute: string): EventParameters {
	let name = attribute.slice(1);

	const options: AddEventListenerOptions = {
		passive: true,
	};

	if (name.includes(':')) {
		const [event, ...items] = name.split(':');

		name = event;

		const normalised = new Set(items.map(item => item.toLowerCase()));

		options.capture = normalised.has('capture');
		options.once = normalised.has('once');
		options.passive = !normalised.has('active');
	}

	return {
		name,
		options,
	};
}

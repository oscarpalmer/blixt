import {nodeProperties} from '../data';
import {Expression} from '../template';
import {storeProperty} from './index';

type EventParameters = {
	name: string;
	options: AddEventListenerOptions;
};

export function addEvent(
	element: HTMLElement | SVGElement,
	attribute: string,
	expression: Expression,
) {
	const {name, options} = getEventParameters(attribute);

	element.addEventListener(name as never, expression.value as never, options);

	element.removeAttribute(attribute);

	storeProperty(element, attribute, {expression, options});
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

export function removeEvents(element: Node): void {
	const stored = nodeProperties.get(element);

	if (stored === undefined) {
		return;
	}

	for (const [name, events] of stored) {
		for (const event of events) {
			if (!(event instanceof Expression)) {
				element.removeEventListener(
					name.slice(1),
					event.expression.value,
					event.options,
				);
			}
		}

		if (events.size === 0) {
			stored.delete(name);
		}
	}

	if (stored.size === 0) {
		nodeProperties.delete(element);
	}
}

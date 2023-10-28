import {hydratableEvents} from '../data';
import type {Expression} from '../template';
import {storeAttributeOrEvent} from './index';

type EventParameters = {
	name: string;
	options: AddEventListenerOptions;
};

type StoredEvent = {
	expression: Expression;
	options: AddEventListenerOptions;
};

const events = new WeakMap<Node, Map<string, Set<StoredEvent>>>();

export function addEvent(
	element: HTMLElement | SVGElement,
	attribute: string,
	expression: Expression,
) {
	const {name, options} = getEventParameters(attribute);

	element.addEventListener(name as never, expression.value as never, options);

	element.removeAttribute(attribute);

	storeAttributeOrEvent(events, element, name, {expression, options});
	storeAttributeOrEvent(hydratableEvents, element, attribute, expression);
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
	const elementEvents = events.get(element);

	if (elementEvents === undefined) {
		return;
	}

	for (const [name, namedEvents] of elementEvents) {
		for (const event of namedEvents) {
			element.removeEventListener(
				name as never,
				event.expression.value as never,
				event.options,
			);
		}
	}

	events.delete(element);
}

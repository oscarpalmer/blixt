import type {Expression} from '../template';

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
	attribute: Attr,
	expression: Expression,
) {
	const {name, options} = getEventParameters(attribute.name);

	element.addEventListener(name as never, expression.value as never, options);

	element.removeAttribute(attribute.name);

	const elementEvents = events.get(element);

	if (elementEvents === undefined) {
		events.set(element, new Map([[name, new Set([{expression, options}])]]));
	} else {
		const namedEvents = elementEvents.get(name);

		if (namedEvents === undefined) {
			elementEvents.set(name, new Set([{expression, options}]));
		} else {
			namedEvents.add({expression, options});
		}
	}
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

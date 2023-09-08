import {type Expression} from '../template';

type EventData = {
	name: string;
	options: AddEventListenerOptions;
};

export function getData(attribute: string): EventData {
	let name = attribute.slice(1);

	const options: AddEventListenerOptions = {
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

export function handleEvent(
	element: HTMLElement,
	attribute: Attr,
	expression: Expression,
) {
	const event = getData(attribute.name);

	element.addEventListener(
		event.name as never,
		expression.value as never,
		event.options,
	);

	element.removeAttribute(attribute.name);
}

import {expect, test} from 'bun:test';
import {addEvent, getEventParameters} from '../../src/helpers/events';

test('getEventParameters', () => {
	const simple = getEventParameters('@click');
	const active = getEventParameters('@click:active');
	const capture = getEventParameters('@click:capture');
	const once = getEventParameters('@click:once');
	const all = getEventParameters('@click:active:capture:once');

	for (const event of [simple, active, capture, once, all]) {
		expect(event.name).toEqual('click');
	}

	expect(simple.options.passive).toEqual(true);
	expect(simple.options.capture).toEqual(undefined);
	expect(simple.options.once).toEqual(undefined);

	expect(active.options.passive).toEqual(false);

	expect(capture.options.capture).toEqual(true);

	expect(once.options.once).toEqual(true);

	expect(all.options.passive).toEqual(false);
	expect(all.options.capture).toEqual(true);
	expect(all.options.once).toEqual(true);
});

test('handleEvent', () => {
	let value = 0;

	const element = document.createElement('div');

	const attribute = document.createAttribute('@click');

	element.setAttribute(attribute.name, '');

	const expression = {
		value() {
			value += 1;
		},
	};

	addEvent(element, attribute, expression);

	expect(element.getAttribute('@click')).toEqual(null);
	expect(value).toEqual(0);

	element.click();

	expect(value).toEqual(1);
});

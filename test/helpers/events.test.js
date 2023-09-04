import {expect, test} from 'bun:test';
import {getData, handleEvent} from '../../src/helpers/events.js';

test('getData', () => {
	const simple = getData('@click');
	const active = getData('@click:active');
	const capture = getData('@click:capture');
	const once = getData('@click:once');
	const all = getData('@click:active:capture:once');

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

	handleEvent(element, attribute, expression);

	expect(element.getAttribute('@click')).toEqual(null);
	expect(value).toEqual(0);

	element.click();

	expect(value).toEqual(1);
});

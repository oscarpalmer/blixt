import {expect, test} from 'bun:test';
import {
	addEvent,
	getEventParameters,
	removeEvents,
} from '../../src/helpers/events';
import {Expression} from '../../src/template';

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

test('addEvent & removeEvent', () => {
	let value = 0;

	const expression = new Expression(() => {
		value += 1;
	});

	const button = document.createElement('button');

	const clickAttribute = document.createAttribute('@click');
	const focusAttribute = document.createAttribute('@focus');

	button.setAttribute(clickAttribute.name, '');
	button.setAttribute(focusAttribute.name, '');

	addEvent(button, clickAttribute.name, expression);
	addEvent(button, focusAttribute.name, expression);

	expect(button.getAttribute('@click')).toEqual(null);
	expect(button.getAttribute('@focus')).toEqual(null);

	button.dispatchEvent(new MouseEvent('click'));

	expect(value).toEqual(1);

	button.dispatchEvent(new FocusEvent('focus'));

	expect(value).toEqual(2);

	removeEvents(button);

	button.click();
	button.focus();

	expect(value).toEqual(2);
});

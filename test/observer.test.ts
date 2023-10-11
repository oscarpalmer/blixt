import {expect, test} from 'bun:test';
import {observe} from '../src/observer';
import {store} from '../src/store';
import {template} from '../src/template';
import {updateArray} from '../src/observer/content';
import type {ObservedItem} from '../src/models';

const context = document.createElement('body');

const stored = store({
	array: [1, 2, 3],
	boolean: true,
	content: 1,
});

test('observe', () => {
	try {
		// @ts-expect-error Testing invalid input
		observe([]);
	} catch (error) {
		expect(error).toBeInstanceOf(TypeError);
	}
});

test('observeArray', () => {
	template`<ul id="observe_array">${() =>
		stored.array.map(item => template`<li>${item}</li>`)}</ul>`.render(context);

	const element = context.querySelector('#observe_array');

	expect(element.children.length).toEqual(3);
	expect(element.textContent).toEqual('123');

	stored.array.push(4);

	setTimeout(() => {
		expect(element.children.length).toEqual(4);
		expect(element.textContent).toEqual('1234');

		stored.array.splice(0, stored.array.length);

		setTimeout(() => {
			expect(element.children.length).toEqual(0);
			expect(element.textContent).toEqual('');
		}, 25);
	}, 25);
});

test('observeAttributes', () => {
	template`<input
	id="observe_attributes"
	hidden="${() => stored.boolean}"
	value="${() => stored.content}"
	data-foo="${() => (stored.boolean ? 'bar' : null)}"
	class.a.b.c="${() => stored.boolean}"
	class...="${() => stored.boolean}"
	style.color.red="${() => stored.boolean}"
	style.font-size="${() => (stored.boolean ? '2em' : null)}"
	style...="${() => stored.boolean}"
	@click="${() => {
		stored.boolean = !stored.boolean;
	}}"
	onclick="event"
	href="javascript:alert('blixt');"
>`.render(context);

	const element = context.querySelector('#observe_attributes');

	expect(element.hidden).toEqual(true);
	expect(element.value).toEqual('1');
	expect(element.dataset.foo).toEqual('bar');
	expect(element.classList.contains('a')).toEqual(true);
	expect(element.classList.contains('b')).toEqual(true);
	expect(element.classList.contains('c')).toEqual(true);
	expect(element.style.color).toEqual('red');
	expect(element.style.fontSize).toEqual('2em');
	expect(element.getAttribute('@click')).toEqual(null);
	expect(element.getAttribute('onclick')).toEqual(null);
	expect(element.getAttribute('href')).toEqual(null);

	stored.boolean = false;

	setTimeout(() => {
		expect(element.hidden).toEqual(false);
		expect(element.value).toEqual('1');
		expect(element.dataset.foo).toEqual(undefined);
		expect(element.classList.contains('a')).toEqual(false);
		expect(element.classList.contains('b')).toEqual(false);
		expect(element.classList.contains('c')).toEqual(false);
		expect(element.style.color).toEqual('');
		expect(element.style.fontSize).toEqual('');
	}, 25);
});

test('observeContent', () => {
	const element = document.createElement('p');

	element.id = 'observe_content_3';
	element.textContent = 'c';

	template`<p	id="observe_content_1">${() =>
		stored.content <= 1 ? 'a' : 'b'}</p>
${() => (stored.content > 1 ? template`<p id="observe_content_2"></p>` : null)}
${element}
${'basic text'}`.render(context);

	const first = context.querySelector('#observe_content_1');

	expect(first.textContent).toEqual('a');
	expect(context.querySelector('#observe_content_2')).toEqual(null);

	stored.content += 1;

	setTimeout(() => {
		expect(first.textContent).toEqual('b');

		expect(context.querySelector('#observe_content_2')).toBeInstanceOf(
			HTMLParagraphElement,
		);

		const third = context.querySelector('#observe_content_3');

		expect(third).toBeInstanceOf(HTMLParagraphElement);
		expect(third.nextSibling).toBeInstanceOf(Text);
		expect(third.nextSibling.textContent).toEqual('basic text');
	}, 25);
});

test('updateArray', () => {
	let items: ObservedItem[] | undefined;

	function callback(ids: number[]) {
		items = updateArray(
			comment,
			items,
			ids.map(id => template`<p>${id}</p>`.identify(id)),
		);

		expect(items.length).toEqual(ids.length);

		for (const id of ids) {
			expect(items[ids.indexOf(id)].identifier).toEqual(id);
		}
	}

	const comment = document.createComment('updateArray');

	context.append(comment);

	callback([1, 2, 3]);
	callback([1, 2, 3, 4]);
	callback([2, 3]);
	callback([3, 2]);

	items = updateArray(
		comment,
		items,
		[1, 2, 3].map(id => template`<p>${id}</p>`.identify(1)),
	);

	expect(items.length).toEqual(3);
	expect(items.every(item => item.identifier === undefined)).toEqual(true);
});

import {expect, test} from 'bun:test';
import {template, Template} from '../../src/template';
import {
	createNode,
	createNodes,
	getNodes,
	replaceNodes,
} from '../../src/helpers/dom';

test('createNode:text', () => {
	const text = createNode('test');

	expect(text).toBeInstanceOf(Text);
	expect(text.textContent).toEqual('test');
});

test('createNode:node', () => {
	const element = document.createElement('div');

	element.innerHTML = 'Hello, world';

	const node = createNode(element);

	expect(node).toBeInstanceOf(HTMLDivElement);
	expect(node.textContent).toEqual('Hello, world');
});

test('createNode:template', () => {
	const templated = template`<p>Hello, world</p>`;

	const node = createNode(templated);

	expect(node).toBeInstanceOf(DocumentFragment);
});

test('createNodes', () => {
	const fragment = createNodes(
		`<p>Hello, world</p><script>alert('test!')</script>`,
	);

	expect(fragment.querySelector('script')).toEqual(null);
});

test('getNodes', () => {
	const original = [
		document.createTextNode('test'),
		(() => {
			const element = document.createElement('div');

			element.innerHTML = 'Hello, world';

			return element;
		})(),
		new Template(['<p>Hello, world</p>']).render(),
	];

	const nodes = getNodes(original);

	expect(nodes.length).toEqual(3);

	expect(nodes[0].length).toEqual(1);
	expect(nodes[1].length).toEqual(1);
	expect(nodes[2].length).toEqual(1);

	expect(nodes[0][0]).toBeInstanceOf(Text);
	expect(nodes[1][0]).toBeInstanceOf(HTMLDivElement);
	expect(nodes[2][0]).toBeInstanceOf(HTMLParagraphElement);
});

test('replaceNodes', () => {
	const callbacks = [
		value => {
			expect(replaceNodes(value, [], false)).toBe(undefined);
		},
		value => {
			expect(replaceNodes(value, [], true)).toBeInstanceOf(Array);
		},
	];

	for (const callback of callbacks) {
		const original = [
			document.createTextNode('test'),
			(() => {
				const element = document.createElement('div');

				element.innerHTML = 'Hello, world';

				return element;
			})(),
			new Template(['<p>Hello, world</p>']).render(),
		];

		const nodes = getNodes(original);

		for (const node of nodes) {
			document.body.append(...node);
		}

		callback(nodes);
	}
});

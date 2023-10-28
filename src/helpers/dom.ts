import {blixt, comment, nodeSubscriptions} from '../data';
import type {
	ObservedItem,
	TemplateData,
	TemplateExpressionValue,
	TemplateExpressions,
} from '../models';
import {observeAttribute} from '../observer/attribute';
import {observeContent} from '../observer/content';
import {Expression, Template} from '../template';
import {addEvent, removeEvents} from './events';
import {getString} from './index';

const documentFragmentConstructor = /^documentfragment$/i;

const onAttributeExpression = /^on/i;

export const sourceAttributeNameExpression = /^(href|src|xlink:href)$/i;

export const sourceAttributeValueExpression = /(data:text\/html|javascript:)/i;

export function cleanNodes(nodes: Node[]): void {
	for (const node of nodes) {
		const subscriptions = nodeSubscriptions.get(node) ?? [];

		for (const subscription of subscriptions) {
			subscription.unsubscribe();
		}

		nodeSubscriptions.delete(node);

		removeEvents(node);

		if (node.hasChildNodes()) {
			cleanNodes(Array.from(node.childNodes));
		}
	}
}

export function createNode(value: any): Node {
	if (value instanceof Node) {
		return value;
	}

	return value instanceof Template
		? value.render()
		: document.createTextNode(getString(value));
}

export function createNodes(html: string): DocumentFragment {
	const element = document.createElement('template');

	element.innerHTML = html;

	const fragment = element.content.cloneNode(true);

	const scripts = Array.from(
		(fragment as HTMLElement).querySelectorAll('script'),
	);

	for (const script of scripts) {
		script.remove();
	}

	fragment.normalize();

	return fragment as DocumentFragment;
}

export function getObservedItem(value: any): ObservedItem {
	return {
		identifier: value instanceof Template ? value.id : undefined,
		nodes: getObservedItems(createNode(value)).flatMap(item => item.nodes),
	};
}

export function getObservedItems(value: Node | Node[]): ObservedItem[] {
	const array = Array.isArray(value) ? value : [value];

	return array
		.filter(item => item instanceof Node)
		.map(item =>
			documentFragmentConstructor.test(item.constructor.name)
				? Array.from(item.childNodes)
				: [item],
		)
		.map(items => ({nodes: items as ChildNode[]}));
}

export function isBadAttribute(attribute: Attr): boolean {
	const {name, value} = attribute;

	if (onAttributeExpression.test(name)) {
		return true;
	}

	return (
		sourceAttributeNameExpression.test(name) &&
		sourceAttributeValueExpression.test(value)
	);
}

export function mapAttributes(
	element: Element,
	expressions: TemplateExpressions,
): void {
	const attributes = Array.from(element.attributes);

	for (const attribute of attributes) {
		const {name, value} = attribute;

		const expression =
			value === comment ? expressions.values[expressions.index++] : undefined;

		const badAttribute = isBadAttribute(attribute);

		if (
			badAttribute ||
			!(expression instanceof Expression) ||
			!(element instanceof HTMLElement || element instanceof SVGElement)
		) {
			if (badAttribute) {
				element.removeAttribute(name);
			}

			continue;
		}

		if (name.startsWith('@')) {
			addEvent(element, attribute, expression);
		} else {
			observeAttribute(element, attribute, expression);
		}
	}
}

export function mapNodes(
	data: WeakMap<Template, TemplateData>,
	template: Template,
	node: Node,
): Node {
	const {expressions} = data.get(template)!;

	const children = Array.from(node.childNodes);

	for (const child of children) {
		if (child.nodeType === 8 && child.nodeValue === blixt) {
			setNode(child as Comment, expressions.values[expressions.index++]);

			continue;
		}

		if (child instanceof Element) {
			mapAttributes(child, expressions);
		}

		if (child.hasChildNodes()) {
			mapNodes(data, template, child);
		}
	}

	return node;
}

export function replaceNodes(
	from: ObservedItem[],
	to: ObservedItem[],
	set: boolean,
): ObservedItem[] | undefined {
	const nodes = (from ?? []).flatMap(item => item.nodes);

	cleanNodes(nodes);

	for (const node of nodes) {
		if (nodes.indexOf(node) === 0) {
			node.before(...to.flatMap(item => item.nodes));
		}

		node.remove();
	}

	return set ? to : undefined;
}

export function setNode(
	comment: Comment,
	value: TemplateExpressionValue,
): void {
	if (value instanceof Expression) {
		observeContent(comment, value);

		return;
	}

	const node = createNode(value);

	comment.replaceWith(
		...(documentFragmentConstructor.test(node.constructor.name)
			? Array.from(node.childNodes)
			: [node]),
	);
}

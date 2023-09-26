import {blixt, comment} from '../data';
import type {
	TemplateData,
	TemplateExpressionValue,
	TemplateExpressions,
} from '../models';
import {observeAttribute} from '../observer/attribute';
import {observeContent} from '../observer/content';
import {Expression, Template} from '../template';
import {addEvent} from './events';
import {getString} from './index';

export function createNode(value: any): Node {
	if (value instanceof Node) {
		return value;
	}

	if (value instanceof Template) {
		return value.render();
	}

	return document.createTextNode(getString(value));
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

export function getNodes(value: Node | Node[]): ChildNode[][] {
	const array = Array.isArray(value) ? value : [value];

	return array
		.filter(item => item instanceof Node)
		.map(item =>
			item instanceof DocumentFragment ? Array.from(item.childNodes) : [item],
		) as ChildNode[][];
}

export function mapAttributes(
	element: Element,
	expressions: TemplateExpressions,
): void {
	const attributes = Array.from(element.attributes);

	for (const attribute of attributes) {
		const expression =
			attribute.value === comment
				? expressions.values[expressions.index++]
				: undefined;

		const isOnAttribute = attribute.name.toLowerCase().startsWith('on');

		if (
			isOnAttribute ||
			!(expression instanceof Expression) ||
			!(element instanceof HTMLElement || element instanceof SVGElement)
		) {
			if (isOnAttribute) {
				element.removeAttribute(attribute.name);
			}

			continue;
		}

		if (attribute.name.startsWith('@')) {
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
	from: ChildNode[][],
	to: ChildNode[][],
	set: boolean,
): ChildNode[][] | undefined {
	const items = (from ?? []).flat();

	for (const item of items) {
		if (items.indexOf(item) === 0) {
			item.before(...to.flat());
		}

		item.remove();
	}

	return set ? to : undefined;
}

export function setNode(comment: Comment, value: TemplateExpressionValue) {
	if (value instanceof Expression) {
		observeContent(comment, value);
	} else {
		comment.replaceWith(
			...getNodes(value instanceof Template ? value.render() : value).flat(),
		);
	}
}

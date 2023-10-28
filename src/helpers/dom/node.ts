import type {
	ObservedItem,
	TemplateData,
	TemplateExpressionValue,
} from '../../models';
import {
	blixt,
	documentFragmentConstructor,
	hydratableAttributes,
	hydratableEvents,
	nodeSubscriptions,
} from '../../data';
import {observeContent} from '../../observer/content';
import {Expression, Template} from '../../template';
import {getString} from '../index';
import {removeEvents} from '../events';
import {mapAttributes} from './attribute';

export function cleanNodes(nodes: Node[], removeSubscriptions: boolean): void {
	for (const node of nodes) {
		hydratableAttributes.delete(node as never);
		hydratableEvents.delete(node as never);

		removeEvents(node);

		if (removeSubscriptions) {
			const subscriptions = nodeSubscriptions.get(node) ?? [];

			for (const subscription of subscriptions) {
				subscription.unsubscribe();
			}

			nodeSubscriptions.delete(node);
		}

		if (node.hasChildNodes()) {
			cleanNodes(Array.from(node.childNodes), removeSubscriptions);
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

	cleanNodes(nodes, true);

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

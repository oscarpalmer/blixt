import type {NodePair} from '../models';
import {nodeItems, nodeProperties, nodeSubscriptions} from '../data';
import {cleanNodes} from '../helpers/dom/node';
import {addEvent} from '../helpers/events';
import {observeAttribute} from '../observer/attribute';
import type {Template} from './index';
import {Expression, render} from './index';

function compareNode(first: Node, second: Node, pairs: NodePair[]): boolean {
	first.normalize();
	second.normalize();

	const firstChildren = Array.from(first.childNodes).filter(child =>
		isValidNode(child),
	);

	const secondChildren = Array.from(second.childNodes).filter(child =>
		isValidNode(child),
	);

	const {length} = firstChildren;

	if (length !== secondChildren.length) {
		console.warn('Nodes do not have same number of children');

		return false;
	}

	if (length === 0) {
		const valid = first.isEqualNode(second);

		if (valid) {
			pairs.push({first, second});
		} else {
			console.warn('Nodes are not equal');
		}

		return valid;
	}

	for (let index = 0; index < length; index += 1) {
		if (!compareNode(firstChildren[index], secondChildren[index], pairs)) {
			return false;
		}
	}

	pairs.push({first, second});

	return true;
}

export function hydrate(
	node: Node,
	template: Template,
	callback?: (node: Node) => void,
): Node {
	const rendered = render(template);

	const pairs: NodePair[] = [];

	if (
		normaliseContent(node) !== normaliseContent(rendered) ||
		!compareNode(node, rendered, pairs)
	) {
		console.warn('Unable to hydrate existing content');

		return node;
	}

	for (const pair of pairs) {
		hydrateContent(pair);
		hydrateProperties(pair);
		hydrateSubscriptions(pair);
	}

	cleanNodes([rendered], false);

	if (typeof callback === 'function') {
		callback(node);
	}

	return node;
}

function hydrateContent(pair: NodePair): void {
	const item = [...nodeItems.values()]
		.find(items =>
			items.some(item => item.nodes.includes(pair.second as never)),
		)
		?.find(item => item.nodes.includes(pair.second as never));

	if (item === undefined) {
		return;
	}

	const index = item.nodes.indexOf(pair.second as never);

	if (index > -1) {
		item.nodes.splice(index, 1, pair.first as never);
	}
}

function hydrateProperties(pair: NodePair): void {
	const properties = nodeProperties.get(pair.second) ?? [];

	for (const [name, items] of properties) {
		for (const item of items) {
			if (item instanceof Expression) {
				observeAttribute(pair.first as never, name, item);
			} else {
				addEvent(pair.first as never, name, item.expression);
			}
		}
	}
}

function hydrateSubscriptions(pair: NodePair): void {
	const subscriptions = nodeSubscriptions.get(pair.second) ?? new Set();

	if (subscriptions.size > 0) {
		nodeSubscriptions.set(pair.first, subscriptions);
	}

	nodeSubscriptions.delete(pair.second);
}

function isValidNode(node: Node): boolean {
	if (node instanceof Text) {
		return (node?.textContent ?? '').trim().length > 0;
	}

	return node instanceof Element ? !/^script$/i.test(node.tagName) : true;
}

function normaliseContent(node: Node): string {
	return (node?.textContent ?? '').replaceAll(/\s+/g, ' ').trim();
}

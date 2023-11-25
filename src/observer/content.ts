import {createUuid} from '@oscarpalmer/atoms';
import type {ObservedItem} from '../models';
import {nodeItems} from '../data';
import {compareArrayOrder} from '../helpers';
import {getObservedItem, getObservedItems} from '../helpers/dom';
import {cleanNodes, createNode, replaceNodes} from '../helpers/dom/node';
import type {Expression} from '../template';
import {Template} from '../template';
import {observe} from './index';

export function observeContent(comment: Comment, expression: Expression): void {
	let id: string | undefined;
	let isText = false;

	observe(expression.value, value => {
		const items = id === undefined ? undefined : nodeItems.get(id);
		const isArray = Array.isArray(value);

		if (value === undefined || value === null || isArray) {
			isText = false;

			id = setNodeItems(
				id,
				isArray && value.length > 0
					? updateArray(comment, items, value)
					: items === undefined
					  ? undefined
					  : replaceNodes(items, [{nodes: [comment]}], false),
			);

			return;
		}

		const node = createNode(value);

		if (items !== undefined && isText && node instanceof Text) {
			if (items[0].nodes[0].textContent !== node.textContent) {
				items[0].nodes[0].textContent = node.textContent;
			}

			return;
		}

		isText = node instanceof Text;

		id = setNodeItems(
			id,
			replaceNodes(items ?? [{nodes: [comment]}], getObservedItems(node), true),
		);
	});
}

export function removeNodeItems(node: Node): void {
	for (const [id, items] of nodeItems) {
		for (const item of items) {
			if (item.nodes.includes(node as never)) {
				item.nodes.splice(item.nodes.indexOf(node as never), 1);
			}
		}

		if (items.flatMap(item => item.nodes).length === 0) {
			nodeItems.delete(id);
		}
	}
}

function setNodeItems(
	id: string | undefined,
	items: ObservedItem[] | undefined,
): string | undefined {
	if (items === undefined) {
		if (id !== undefined) {
			nodeItems.delete(id);
		}

		return undefined;
	}

	id ??= createUuid();

	nodeItems.set(id, items);

	return id;
}

export function updateArray(
	comment: Comment,
	current: ObservedItem[] | undefined,
	array: unknown[],
): ObservedItem[] {
	let templated = array.filter(
		item => item instanceof Template && item.id !== undefined,
	) as Template[];

	const identifiers = templated.map(template => template.id!);

	if (new Set(identifiers).size !== array.length) {
		templated = [];
	}

	if (current === undefined || templated.length === 0) {
		return replaceNodes(
			current ?? [{nodes: [comment]}],
			templated.length > 0
				? templated.map(template => getObservedItem(template))
				: getObservedItems(array.map(item => createNode(item))),
			true,
		)!;
	}

	const observed = [];

	for (const template of templated) {
		observed.push(
			current.find(item => item.identifier === template.id) ??
				getObservedItem(template),
		);
	}

	const oldIdentifiers = current.map(item => item.identifier!);
	const compared = compareArrayOrder(oldIdentifiers, identifiers);

	let position = current[0].nodes[0];

	if (compared !== 'removed') {
		const items = observed.flatMap(item =>
			item.nodes.map(node => ({
				id: item.identifier!,
				value: node,
			})),
		);

		const before =
			compared === 'added' && !oldIdentifiers.includes(identifiers[0]);

		for (const item of items) {
			if (compared === 'dissimilar' || !oldIdentifiers.includes(item.id)) {
				if (items.indexOf(item) === 0 && before) {
					position.before(item.value);
				} else {
					position.after(item.value);
				}
			}

			position = item.value;
		}
	}

	const nodes = current
		.filter(item => !identifiers.includes(item.identifier!))
		.flatMap(item => item.nodes);

	cleanNodes(nodes, true);

	for (const node of nodes) {
		node.remove();
	}

	return observed;
}

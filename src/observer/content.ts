import type {ObservedItem} from '../models';
import {compareArrayOrder} from '../helpers';
import {getObservedItem, getObservedItems} from '../helpers/dom';
import {cleanNodes, createNode, replaceNodes} from '../helpers/dom/node';
import type {Expression} from '../template';
import {Template} from '../template';
import {observe} from './index';

export function observeContent(comment: Comment, expression: Expression): void {
	let current: ObservedItem[] | undefined;
	let isText = false;

	observe(expression.value, (value: any) => {
		const isArray = Array.isArray(value);

		if (value === undefined || value === null || isArray) {
			isText = false;

			current =
				isArray && value.length > 0
					? updateArray(comment, current, value)
					: current === undefined
					? undefined
					: replaceNodes(current, [{nodes: [comment]}], false)!;

			return;
		}

		const node = createNode(value);

		if (current !== undefined && isText && node instanceof Text) {
			if (current[0].nodes[0].textContent !== node.textContent) {
				current[0].nodes[0].textContent = node.textContent;
			}

			return;
		}

		isText = node instanceof Text;

		current = replaceNodes(
			current ?? [{nodes: [comment]}],
			getObservedItems(node),
			true,
		);
	});
}

export function updateArray(
	comment: Comment,
	current: ObservedItem[] | undefined,
	array: any[],
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

	const oldIdentifiers = current.map(item => item.identifier!);

	const compared = compareArrayOrder(oldIdentifiers, identifiers);

	const observed = [];

	for (const template of templated) {
		observed.push(
			current.find(item => item.identifier === template.id) ??
				getObservedItem(template),
		);
	}

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

	cleanNodes(nodes);

	for (const node of nodes) {
		node.remove();
	}

	return observed;
}

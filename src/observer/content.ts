import {createNode, getNodes, replaceNodes} from '../helpers/dom';
import type {Expression} from '../template';
import {observe} from '.';

export function observeContent(comment: Comment, expression: Expression): void {
	let current: ChildNode[][] | undefined;
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
					: replaceNodes(current, [[comment]], false)!;

			return;
		}

		const node = createNode(value);

		if (current !== undefined && isText && node instanceof Text) {
			if (current[0][0].textContent !== node.textContent) {
				current[0][0].textContent = node.textContent;
			}

			return;
		}

		isText = node instanceof Text;

		current = replaceNodes(current ?? [[comment]], getNodes(node), true);
	});
}

export function updateArray(
	comment: Comment,
	current: ChildNode[][] | undefined,
	array: any[],
): ChildNode[][] {
	return replaceNodes(
		current ?? [[comment]],
		getNodes(array.map(item => createNode(item))),
		true,
	)!;
}

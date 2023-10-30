import type {ObservedItem} from '../../models';
import {documentFragmentConstructor} from '../../data';
import {Template} from '../../template';
import {createNode} from './node';

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

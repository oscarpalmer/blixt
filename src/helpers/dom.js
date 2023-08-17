import {observeAttribute, observeContent} from '../observer.js';
import {blixt, comment, Expression, Template} from '../template.js';
import {handleEvent} from './events.js';

/**
 * @param {any} value
 * @returns {Node}
 */
export function createNode(value) {
	if (value instanceof Node) {
		return value;
	}

	if (value instanceof Template) {
		return value.render();
	}

	return document.createTextNode(value);
}

/**
 * @param {string} html
 * @returns {Node}
 */
export function createNodes(html) {
	const element = document.createElement('template');

	element.innerHTML = html;

	const fragment = element.content.cloneNode(true);

	fragment.normalize();

	return fragment;
}

/**
 * @param {Node|Node[]} node
 * @returns {Node[]}
 */
export function getNodes(node) {
	const array = Array.isArray(node) ? node : [node];

	return array
		// eslint-disable-next-line unicorn/prefer-array-flat-map
		.map(node =>
			node instanceof DocumentFragment ? [...node.childNodes] : node,
		)
		.flat();
}

/**
 * @param {Element} element
 * @param {TemplateExpressions} expressions
 * @returns {void}
 */
export function mapAttributes(element, expressions) {
	const attributes = Array.from(element.attributes);

	for (const attribute of attributes) {
		if (attribute.value !== comment) {
			continue;
		}

		const expression = expressions.values[expressions.index++];

		if (!(expression instanceof Expression)) {
			continue;
		}

		if (attribute.name.startsWith('@')) {
			handleEvent(element, attribute, expression);
		}
		else {
			observeAttribute(element, attribute, expression);
		}
	}
}

/**
 * @param {WeakMap<import ('../template.js').Template, import ('../template.js').TemplateData>} data
 * @param {Template} template
 * @param {Node} node
 * @returns {boolean}
 */
export function mapNodes(data, template, node) {
	const {expressions} = data.get(template) ?? {};

	const children = Array.from(node.childNodes);

	for (const child of children) {
		if (child.nodeType === 8 && child.nodeValue === blixt) {
			setNode(child, expressions.values[expressions.index++]);

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

/**
 * @param {Node[]} from
 * @param {Node[]} to
 * @param {boolean} set
 * @returns {Node[]|null}
 */
export function replaceNodes(from, to, set) {
	for (const item of from ?? []) {
		if (from.indexOf(item) === 0) {
			item.replaceWith(...to);
		}
		else {
			item.remove();
		}
	}

	return set ? to : null;
}

/**
 * @param {Comment} comment
 * @param {Expression|Node|Template} expression
 * @returns {void}
 */
export function setNode(comment, expression) {
	if (expression instanceof Expression) {
		observeContent(comment, expression);
	}
	else {
		comment.replaceWith(
			expression instanceof Node ? expression : expression.render(),
		);
	}
}

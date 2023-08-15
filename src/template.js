import {observe} from './store.js';

/**
 * @typedef TemplateExpressions
 * @property {number} index
 * @property {any[]} original
 * @property {Array<Expression|Node|Template>} values
 */

/**
 * @typedef TemplateData
 * @property {TemplateExpressions} expressions
 * @property {TemplateStringsArray} strings
 */

const blixt = 'blixt';
const comment = `<!--${blixt}-->`;

/** @type {WeakMap<Template, TemplateData>} */
const data = new WeakMap();

class Expression {
	/** @param {Function} callback */
	constructor(callback) {
		this.callback = callback;
	}

	/** @returns {any} */
	run() {
		return this.callback();
	}
}

class Template {
	/**
	 * @param {TemplateStringsArray} strings
	 * @param {...any} expressions
	 */
	constructor(strings, ...expressions) {
		data.set(this, {
			strings,
			expressions: {
				index: 0,
				original: expressions,
				values: [],
			},
		});
	}

	/**
	 * @param {Element|undefined} parent
	 * @returns {Node|undefined}
	 */
	render(parent) {
		const value = toString(this);
		const rendered = createNodes(value);
		const mapped = mapNodes(this, rendered);

		parent?.append(mapped);

		return parent ?? mapped;
	}
}

/**
 * @param {string} html
 * @returns {Node}
 */
function createNodes(html) {
	const element = document.createElement('template');

	element.innerHTML = html;

	const fragment = element.content.cloneNode(true);

	fragment.normalize();

	return fragment;
}

/**
 * @param {Template} template
 * @param {Node} node
 * @returns {boolean}
 */
function mapNodes(template, node) {
	const {expressions} = data.get(template) ?? {};

	const children = Array.from(node.childNodes);

	for (const child of children) {
		if (child.nodeType === 8 && child.nodeValue === blixt) {
			setNode(child, expressions.values[expressions.index++]);

			continue;
		}

		if (child.hasChildNodes()) {
			mapNodes(template, child);
		}
	}

	return node;
}

/**
 * @param {Comment} comment
 * @param {Expression} expression
 * @returns {void}
 */
function setExpression(comment, expression) {
	/**
	 * @param {Node[]} from
	 * @param {Node[]} to
	 * @param {boolean} set
	 */
	function replace(from, to, set) {
		for (const item of from ?? []) {
			if (from.indexOf(item) === 0) {
				item.replaceWith(...to);
			} else {
				item.remove();
			}
		}

		current = set ? to : null;
	}

	let current = null;

	observe(expression, value => {
		if (value === undefined || value === null) {
			replace(current, [comment], false);

			return;
		}

		// TODO: support arrays
		// TODO: smarter replace for chunks

		if (Array.isArray(value)) {
			return;
		}

		let node = value instanceof Template ? value.render() : value;

		if (
			current?.length === 1 &&
			current[0] instanceof Text &&
			!(node instanceof Node)
		) {
			current[0].textContent = value;

			return;
		}

		if (!(node instanceof Node)) {
			node = document.createTextNode(node);
		}

		replace(
			current ?? [comment],
			node instanceof DocumentFragment ? [...node.childNodes] : [node],
			true,
		);
	});
}

/**
 * @param {Comment} comment
 * @param {Expression|Node|Template} expression
 * @returns {void}
 */
function setNode(comment, expression) {
	if (expression instanceof Expression) {
		setExpression(comment, expression);
	} else {
		comment.replaceWith(
			expression instanceof Node ? expression : expression.render(),
		);
	}
}

/**
 * Renders a template
 * @param {TemplateStringsArray} strings
 * @param {...any} expressions
 * @returns {Template}
 */
export function template(strings, ...expressions) {
	return new Template(strings, ...expressions);
}

/**
 * @param {Template} template
 * @returns {string}
 */
function toString(template) {
	const {expressions, strings} = data.get(template);

	/**
	 * @param {string} value
	 * @param {any} expression
	 */
	function express(value, expression) {
		const isFunction = typeof expression === 'function';

		if (
			isFunction ||
			expression instanceof Node ||
			expression instanceof Template
		) {
			expressions.values.push(
				isFunction ? new Expression(expression) : expression,
			);

			return value + comment;
		}

		if (Array.isArray(expression)) {
			let expressed = '';

			for (const exp of expression) {
				expressed += express('', exp);
			}

			return value + expressed;
		}

		return value + expression;
	}

	let html = '';

	for (const value of strings) {
		const index = strings.indexOf(value);
		const expression = expressions.original[index];

		html += expression === undefined ? value : express(value, expression);
	}

	return html;
}

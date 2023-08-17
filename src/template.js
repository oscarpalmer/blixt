import {createNodes, mapNodes} from './helpers/index.js';

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

export const blixt = 'blixt';
export const comment = `<!--${blixt}-->`;

/** @type {WeakMap<Template, TemplateData>} */
const data = new WeakMap();

export class Expression {
	/** @type {Function} */
	#value = null;

	get value() {
		return this.#value;
	}

	/** @param {Function} callback */
	constructor(callback) {
		this.#value = callback;
	}
}

export class Template {
	/**
	 * @param {TemplateStringsArray} strings
	 * @param {...any} expressions
	 */
	constructor(strings, ...expressions) {
		data.set(
			this,
			{
				strings,
				expressions: {
					index: 0,
					original: expressions,
					values: [],
				},
			},
		);
	}

	/**
	 * @param {Element|undefined} parent
	 * @returns {Node|undefined}
	 */
	render(parent) {
		const value = toString(this);
		const rendered = createNodes(value);
		const mapped = mapNodes(data, this, rendered);

		parent?.append(mapped);

		return parent ?? mapped;
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
			isFunction
			|| expression instanceof Node
			|| expression instanceof Template
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

	// eslint-disable-next-line unicorn/no-for-loop
	for (let index = 0; index < strings.length; index += 1) {
		const value = strings[index];
		const expression = expressions.original[index];

		html += expression === undefined ? value : express(value, expression);
	}

	return html;
}

/**
 * @typedef Expressions
 * @property {number} index
 * @property {any[]} original
 * @property {Array<Function|Node|Template>} values
 */

/**
 * @typedef TemplateData
 * @property {Expressions} expressions
 * @property {TemplateStringsArray} strings
 */

const comment = '<!-- $ -->';

/** @type {WeakMap<Template, TemplateData>} */
const data = new WeakMap();

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
		if (child.nodeType === 8) {
			const expression = expressions.values[expressions.index];

			let replacement;

			if (expression instanceof Node) {
				replacement = expression;
			} else if (expression instanceof Template) {
				replacement = expression.render();
			} else {
				replacement = document.createTextNode(expression());
			}

			child.replaceWith(replacement);

			expressions.index += 1;

			continue;
		}

		if (child.hasChildNodes()) {
			mapNodes(template, child);
		}
	}

	return node;
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
		if (
			typeof expression === 'function' ||
			expression instanceof Node ||
			expression instanceof Template
		) {
			expressions.values.push(expression);

			return value + comment;
		}

		if (Array.isArray(expression)) {
			let expressed = '';

			for (const e of expression) {
				expressed += express('', e);
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

/** @type {WeakMap<Template, {expressions: any[]; strings: TemplateStringsArray}>} */
const data = new WeakMap();

class Template {
	/**
	 * @param {TemplateStringsArray} strings
	 * @param {...any} expressions
	 */
	constructor(strings, ...expressions) {
		data.set(this, {
			expressions,
			strings,
		});
	}

	/**
	 * @param {Element|undefined} parent
	 * @returns {Node|undefined}
	 */
	render(parent) {
		const value = toString(this);
		const rendered = createNodes(value);

		if (rendered === undefined) {
			return parent ?? undefined;
		}

		parent?.append(rendered);

		return parent ?? rendered;
	}
}

/**
 * @param {string|undefined} html
 * @returns {Node}
 */
function createNodes(html) {
	if (html === undefined) {
		return undefined;
	}

	const element = document.createElement('template');

	element.innerHTML = html;

	const fragment = element.content.cloneNode(true);

	fragment.normalize();

	return fragment;
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
 * @returns {string|undefined}
 */
function toString(template) {
	const {expressions, strings} = data.get(template) ?? {};

	if (expressions === undefined || strings === undefined) {
		return undefined;
	}

	let html = '';

	for (const value of strings) {
		const index = strings.indexOf(value);
		const expression = expressions[index];

		if (typeof expression === 'function') {
			html += value + expression();

			continue;
		}

		html += Array.isArray(expression)
			? value + expression.join('')
			: value + String(expression ?? '');
	}

	return html;
}

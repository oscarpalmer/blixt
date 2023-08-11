/**
 * Renders a template
 * @param {TemplateStringsArray} strings
 * @param {...any} expressions
 * @returns {string}
 */
export function template(strings, ...expressions) {
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

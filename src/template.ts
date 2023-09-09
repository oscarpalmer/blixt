import {getString} from './helpers';
import {createNodes, mapNodes} from './helpers/dom';

export type TemplateExpressionValue = Expression | Node | Template;

export type TemplateExpressions = {
	index: number;
	original: any[];
	values: TemplateExpressionValue[];
};

export type TemplateData = {
	expressions: TemplateExpressions;
	strings: TemplateStringsArray;
};

export const blixt = 'blixt';
export const comment = `<!--${blixt}-->`;

const data = new WeakMap<Template, TemplateData>();

export class Expression {
	get value() {
		return this.callback;
	}

	constructor(private readonly callback: (...args: any[]) => any) {}
}

export class Template {
	constructor(strings: TemplateStringsArray, expressions: any[]) {
		data.set(this, {
			strings,
			expressions: {
				index: 0,
				original: expressions ?? [],
				values: [],
			},
		});
	}

	render(parent?: Element): Node {
		const value = toString(this);
		const rendered = createNodes(value);
		const mapped = mapNodes(data, this, rendered);

		parent?.append(mapped);

		return parent ?? mapped;
	}
}

/**
 * Renders a template
 */
export function template(strings: TemplateStringsArray, ...expressions: any[]) {
	return new Template(strings, expressions);
}

function toString(template: Template): string {
	const {strings, expressions} = data.get(template)!;

	function express(value: string, expression: any): string {
		const isFunction = typeof expression === 'function';

		if (
			isFunction ||
			expression instanceof Node ||
			expression instanceof Template
		) {
			expressions.values.push(
				(isFunction
					? new Expression(expression as never)
					: expression) as never,
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

		return value + getString(expression);
	}

	let html = '';

	// eslint-disable-next-line unicorn/no-for-loop
	for (let index = 0; index < strings.length; index += 1) {
		const value = strings[index];
		const expression = expressions.original[index] as unknown;

		html += expression === undefined ? value : express(value, expression);
	}

	return html;
}

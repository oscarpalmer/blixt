import {comment} from './data';
import {getString, isKey} from './helpers';
import type {Key, TemplateData} from './models';
import {createNodes, mapNodes} from './helpers/dom/node';

const templateData = new WeakMap<Template, TemplateData>();

export class Expression {
	get value() {
		return this.callback;
	}

	constructor(private readonly callback: (...args: any[]) => any) {}
}

export class Template {
	private identifier: Key | undefined;

	/**
	 * Gets the template's ID
	 * @returns {(number|string|symbol)=}
	 */
	get id(): Key | undefined {
		return this.identifier;
	}

	/**
	 * Creates a template
	 * @param {TemplateStringsArray} strings
	 * @param {...any} expressions
	 */
	constructor(strings: TemplateStringsArray, expressions: any[]) {
		templateData.set(this, {
			strings,
			expressions: {
				index: 0,
				original: expressions ?? [],
				values: [],
			},
		});
	}

	/**
	 * Sets the template's ID to uniquely identify it in a list of templates
	 * @param {number|string|symbol} key
	 * @returns {Template}
	 */
	identify(key: Key): this {
		if (this.identifier === undefined && isKey(key)) {
			this.identifier = key;
		}

		return this;
	}

	/**
	 * Renders a template, on its own or for a parent
	 * @param {ParentNode=} parent
	 * @returns {Node}
	 */
	render(parent?: ParentNode): Node {
		const asString = toString(this);
		const nodes = createNodes(asString);
		const mapped = mapNodes(templateData, this, nodes);

		parent?.append(mapped);

		return parent ?? mapped;
	}
}

/**
 * Creates a template
 */
export function template(strings: TemplateStringsArray, ...expressions: any[]) {
	return new Template(strings, expressions);
}

function toString(template: Template): string {
	const {strings, expressions} = templateData.get(template)!;

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

	for (let index = 0; index < strings.length; index += 1) {
		const value = strings[index];
		const expression = expressions.original[index] as unknown;

		html += expression === undefined ? value : express(value, expression);
	}

	return html;
}

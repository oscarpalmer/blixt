import type {Key} from '../models';
import {comment, templateData} from '../data';
import {getString, isKey} from '../helpers';
import {createNodes, mapNodes} from '../helpers/dom/node';
import {hydrate} from './hydration';

export class Expression {
	get value() {
		return this.callback;
	}

	constructor(private readonly callback: (...args: unknown[]) => any) {}
}

export class Template {
	private identifier: Key | undefined;

	/**
	 * Gets the template's ID
	 * @returns {(number|string|symbol)=} The template's ID (undefined if not set)
	 */
	get id(): Key | undefined {
		return this.identifier;
	}

	/**
	 * Creates a template
	 * @param {TemplateStringsArray} strings
	 * @param {...any} expressions
	 */
	constructor(strings: TemplateStringsArray, expressions: unknown[]) {
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
	 * - Hydrates an existing node using the template and all its expressions
	 * - If a callback is provided, it will be called after the node has been successfully hydrated
	 *
	 * @param {Node} node Node to hydrate
	 * @param {((node: Node) => void)=} callback Callback to call after hydration
	 * @returns {Node} Hydrated node
	 */
	hydrate(node: Node, callback: ((node: Node) => void) | undefined): Node {
		return hydrate(node, this, callback);
	}

	/**
	 * Sets the template's ID to uniquely identify it in a list of templates
	 * @param {number|string|symbol} key Template ID
	 * @returns {Template} The template
	 */
	identify(key: Key): this {
		if (this.identifier === undefined && isKey(key)) {
			this.identifier = key;
		}

		return this;
	}

	/**
	 * Renders a template, on its own or for a parent
	 * @param {ParentNode=} parent Optional parent node to append the template to
	 * @returns {Node} Rendered template node (or the parent node if provided)
	 */
	render(parent?: ParentNode): Node {
		const rendered = render(this);

		parent?.append(rendered);

		return parent ?? rendered;
	}
}

export function render(template: Template): Node {
	const asString = toString(template);
	const nodes = createNodes(asString);

	return mapNodes(templateData, template, nodes);
}

/**
 * Creates a template
 */
export function template(
	strings: TemplateStringsArray,
	...expressions: unknown[]
) {
	return new Template(strings, expressions);
}

export function toString(template: Template): string {
	const {strings, expressions} = templateData.get(template)!;

	function express(value: string, expression: unknown): string {
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

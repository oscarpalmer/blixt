import type {TemplateExpressions} from '../../models';
import {comment} from '../../data';
import {observeAttribute} from '../../observer/attribute';
import {Expression} from '../../template';
import {addEvent} from '../events';

const onAttributeExpression = /^on/i;

export const sourceAttributeNameExpression = /^(href|src|xlink:href)$/i;

export const sourceAttributeValueExpression = /(data:text\/html|javascript:)/i;

export function isBadAttribute(attribute: Attr): boolean {
	const {name, value} = attribute;

	return (
		onAttributeExpression.test(name) ||
		(sourceAttributeNameExpression.test(name) &&
			sourceAttributeValueExpression.test(value))
	);
}

export function mapAttributes(
	element: Element,
	expressions: TemplateExpressions,
): void {
	const attributes = Array.from(element.attributes);

	for (const attribute of attributes) {
		const {name, value} = attribute;

		const expression =
			value === comment ? expressions.values[expressions.index++] : undefined;

		const badAttribute = isBadAttribute(attribute);

		if (
			badAttribute ||
			!(expression instanceof Expression) ||
			!(element instanceof HTMLElement || element instanceof SVGElement)
		) {
			if (badAttribute) {
				element.removeAttribute(name);
			}

			continue;
		}

		if (name.startsWith('@')) {
			addEvent(element, attribute.name, expression);
		} else {
			observeAttribute(element, attribute.name, expression);
		}
	}
}

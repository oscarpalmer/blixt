import {
	booleanAttributes,
	classAttributeExpression,
	styleAttributeExpression,
	valueAttributeExpression,
} from '../data';
import type {Expression} from '../template';
import {observe} from './index';

export function observeAttribute(
	element: HTMLElement | SVGElement,
	attribute: Attr,
	expression: Expression,
): void {
	const {name} = attribute;

	const isBoolean = booleanAttributes.has(name.toLowerCase());
	const isClass = classAttributeExpression.test(name);
	const isStyle = styleAttributeExpression.test(name);

	if (isBoolean || isClass || isStyle) {
		element.removeAttribute(name);
	}

	if (isBoolean) {
		observeBooleanAttribute(element, name, expression);
	} else if (isClass) {
		observeClassAttribute(element, name, expression);
	} else if (isStyle) {
		observeStyleAttribute(element, name, expression);
	} else {
		observeValueAttribute(element, name, expression);
	}
}

function observeBooleanAttribute(
	element: HTMLElement | SVGElement,
	name: string,
	expression: Expression,
): void {
	observe(expression.value, (value: any) => {
		if (typeof value === 'boolean') {
			(element as Record<string, any>)[name] = value;
		}
	});
}

function observeClassAttribute(
	element: HTMLElement | SVGElement,
	name: string,
	expression: Expression,
): void {
	const classes = name
		.split('.')
		.slice(1)
		.map(name => name.trim())
		.filter(name => name.length > 0);

	if (classes.length === 0) {
		return;
	}

	observe(expression.value, (value: any) => {
		if (value === true) {
			element.classList.add(...classes);
		} else {
			element.classList.remove(...classes);
		}
	});
}

function observeStyleAttribute(
	element: HTMLElement | SVGElement,
	name: string,
	expression: Expression,
): void {
	const [, first, second] = name.split('.');

	const property = first.trim();
	const suffix = second?.trim();

	if (property.length === 0 || (suffix !== undefined && suffix.length === 0)) {
		return;
	}

	observe(expression.value, (value: any) => {
		if (
			value === undefined ||
			value === null ||
			value === false ||
			(value === true && suffix === undefined)
		) {
			element.style.removeProperty(property);
		} else {
			element.style.setProperty(
				property,
				value === true ? suffix : `${value}${suffix ?? ''}`,
			);
		}
	});
}

function observeValueAttribute(
	element: HTMLElement | SVGElement,
	name: string,
	expression: Expression,
): void {
	const isValueAttribute = valueAttributeExpression.test(name);

	observe(expression.value, (value: any) => {
		if (isValueAttribute) {
			(element as HTMLInputElement).value = value as never;
		}

		if (value === undefined || value === null) {
			element.removeAttribute(name);
		} else {
			element.setAttribute(name, value as never);
		}
	});
}

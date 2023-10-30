import {storeProperty, storeSubscription} from '../helpers';
import type {Expression} from '../template';
import type {ObservableSubscription} from './index';
import {observe} from './index';

const booleanAttributes = new Set([
	'checked',
	'disabled',
	'hidden',
	'inert',
	'multiple',
	'open',
	'readonly',
	'required',
	'selected',
]);

const classAttributeExpression = /^class\./i;

const styleAttributeExpression = /^style\./i;

const valueAttributeExpression = /^value$/i;

export function observeAttribute(
	element: HTMLElement | SVGElement,
	attribute: string,
	expression: Expression,
): void {
	const isBoolean = booleanAttributes.has(attribute.toLowerCase());
	const isClass = classAttributeExpression.test(attribute);
	const isStyle = styleAttributeExpression.test(attribute);

	if (isBoolean || isClass || isStyle) {
		element.removeAttribute(attribute);
	}

	let subscription: ObservableSubscription | undefined;

	if (isBoolean) {
		subscription = observeBooleanAttribute(element, attribute, expression);
	} else if (isClass) {
		subscription = observeClassAttribute(element, attribute, expression);
	} else if (isStyle) {
		subscription = observeStyleAttribute(element, attribute, expression);
	} else {
		subscription = observeValueAttribute(element, attribute, expression);
	}

	if (subscription === undefined) {
		return;
	}

	storeProperty(element, attribute, expression);
	storeSubscription(element, subscription);
}

function observeBooleanAttribute(
	element: HTMLElement | SVGElement,
	name: string,
	expression: Expression,
): ObservableSubscription {
	return observe(expression.value, (value: any) => {
		const isBoolean = typeof value === 'boolean';

		if (value === undefined || value === null || isBoolean) {
			(element as Record<string, any>)[name] = isBoolean ? value : false;
		}
	});
}

function observeClassAttribute(
	element: HTMLElement | SVGElement,
	name: string,
	expression: Expression,
): ObservableSubscription | undefined {
	const classes = name
		.split('.')
		.slice(1)
		.map(name => name.trim())
		.filter(name => name.length > 0);

	if (classes.length === 0) {
		return;
	}

	return observe(expression.value, (value: any) => {
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
): ObservableSubscription | undefined {
	const [, first, second] = name.split('.');

	const property = first.trim();
	const suffix = second?.trim();

	if (property.length === 0 || (suffix !== undefined && suffix.length === 0)) {
		return;
	}

	return observe(expression.value, (value: any) => {
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
): ObservableSubscription {
	const isValueAttribute = valueAttributeExpression.test(name);

	return observe(expression.value, (value: any) => {
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

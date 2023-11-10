import type {Expression, Template} from './template';

export type Data = {[index: number]: any; [key: string]: any};

export type EventExpression = {
	expression: Expression;
	options: AddEventListenerOptions;
};

export type Key = number | string | symbol;

export type NodePair = {
	first: Node;
	second: Node;
};

export type ObservedItem = {
	identifier?: Key;
	nodes: ChildNode[];
};

export class State {}

export type Store<T extends Data> = {
	[K in keyof T]: T[K] extends unknown[]
		? T[K]
		: T[K] extends Data
		? Store<T[K]> & Data
		: T[K];
};

export type Subscriber = (
	newValue: unknown,
	oldValue?: unknown,
	origin?: string,
) => void;

export type TemplateExpressionValue = Expression | Node | Template;

export type TemplateExpressions = {
	index: number;
	original: unknown[];
	values: TemplateExpressionValue[];
};

export type TemplateData = {
	expressions: TemplateExpressions;
	strings: TemplateStringsArray;
};

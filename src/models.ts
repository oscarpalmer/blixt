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
	[K in keyof T]: T[K] extends Data ? Store<T[K]> : T[K];
} & Data;

export type Subscriber = (
	newValue: any,
	oldValue?: any,
	origin?: string,
) => void;

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

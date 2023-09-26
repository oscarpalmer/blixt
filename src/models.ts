import type {Expression, Template} from './template';

export type Data = {[index: number]: any; [key: string]: any};

export type EventParameters = {
	name: string;
	options: AddEventListenerOptions;
};

export type HandleArrayParameters = {
	array: any[];
	callback: string;
	state: State;
	prefix: string;
	value: any;
};

export type Key = number | string | symbol;

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
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

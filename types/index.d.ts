/**
 * Observes changes for properties used in a function
 */
export declare function observe(
	callback: () => unknown,
	after: (value: unknown) => unknown,
): unknown;

export type Key = string | number | symbol;

export type Data = {
	[index: number]: unknown;
	[key: string]: unknown;
};

export type Store<T extends Data> = {
	[K in keyof T]: T[K] extends Data ? Store<T[K]> : T[K];
} & Data;

type Subscriber = (
	newValue: unknown,
	oldValue?: unknown,
	origin?: string,
) => void;

/**
 * Is the value a reactive store?
 */
export declare function isStore(value: unknown): boolean;

/**
 * Creates a reactive store
 */
export declare function store<T extends Data>(data: T): Store<T>;

/**
 * Subscribes to value changes for a key in a store
 */
export declare function subscribe<T extends Data>(
	store: Store<T>,
	key: Key,
	callback: Subscriber,
): void;

/**
 * Unsubscribes from value changes for a key in a store
 */
export declare function unsubscribe<T extends Data>(
	store: Store<T>,
	key: Key,
	callback: Subscriber,
): void;

export declare class Template {
	constructor(strings: TemplateStringsArray, expressions: unknown[]);
	render(parent?: Element): Node;
}

/**
 * Renders a template
 */
export declare function template(
	strings: TemplateStringsArray,
	...expressions: unknown[]
): Template;

/**
 * Is the value a reactive store?
 * @param {any} value
 * @returns {boolean}
 */
export function isStore(value: any): boolean;

/**
 * Observes changes for properties used in a function
 * @param {{(...args: any[]) => any}} callback
 * @param {{(value: any) => void}=} after
 * @returns {void}
 */
export function observe(callback: (...args: any[]) => any, after?: (value: any) => void): void;

/**
 * Creates a reactive store
 * @template {Data} T
 * @param {T} data
 * @returns {Store<T>}
 */
export function store<T extends Data>(data: T): Store<T>;

/**
 * Subscribes to value changes for a key in a store
 * @template {Data} T
 * @param {Store<T>} store
 * @param {Key} key
 * @param {Subscriber} callback
 * @returns {void}
 */
export function subscribe<T extends Data>(
	store: Store<T>,
	key: Key,
	callback: Subscriber,
): void;

/**
 * Unsubscribes from value changes for a key in a store
 * @template {Data} T
 * @param {Store<T>} store
 * @param {Key} key
 * @param {Subscriber} callback
 * @returns {void}
 */
export function unsubscribe<T extends Data>(
	store: Store<T>,
	key: Key,
	callback: Subscriber,
): void;

export type Data = {
	[index: number]: any;
	[key: string]: any;
};

export type Key = number | string;

export type Store<T> = {
	[K in keyof T]: T[K] extends Data ? Store<T[K]> : T[K];
} & Data;

export type Subscriber = (
	newValue: any,
	oldValue?: any | undefined,
	origin?: string | undefined,
) => void;

/**
 * Renders a template
 * @param {TemplateStringsArray} strings
 * @param {...any} expressions
 * @returns {Template}
 */
export function template(
	strings: TemplateStringsArray,
	...expressions: any[]
): Template;

declare class Template {
	/**
	 * @param {TemplateStringsArray} strings
	 * @param {...any} expressions
	 */
	constructor(strings: TemplateStringsArray, ...expressions: any[]);

	/**
	 * @param {Element|undefined} parent
	 * @returns {Node|undefined}
	 */
	render(parent: Element | undefined): Node | undefined;
}

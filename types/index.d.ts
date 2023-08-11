/**
 * Is the value a reactive store?
 * @param {any} value
 * @returns {boolean}
 */
export function isStore(value: any): boolean;

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
 */
export function unsubscribe<T extends Data>(
	store: Store<T>,
	key: Key,
	callback: Subscriber,
): void;

export type Data = {
	[index: number]: any;
	[key: string]: any;
	[sym: symbol]: any;
};

export type Key = number | string | symbol;

export type Store<T> = {
	[K in keyof T]: T[K] extends Data ? Store<T[K]> : T[K];
} & Data;

export type Subscriber = (value: any, origin?: string) => void;

/**
 * Renders a template
 * @param {TemplateStringsArray} strings
 * @param {...any} expressions
 * @returns {string}
 */
export function template(
	strings: TemplateStringsArray,
	...expressions: any[]
): string;

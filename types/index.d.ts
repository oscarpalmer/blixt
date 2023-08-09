/**
 * Is the value a reactive store?
 * @param {any} value
 * @returns {boolean}
 */
export function isStore(value: any): boolean;
/**
 * Creates a reactive store
 * @param {object} data
 * @returns {object}
 */
export function store(data: object): object;
/**
 * Subscribes to value changes for a key in a store
 * @param {any} store
 * @param {Key} key
 * @param {Subscriber} callback
 * @returns {void}
 */
export function subscribe(store: any, key: Key, callback: Subscriber): void;
/**
 * Unsibscribes from value changes for a key in a store
 * @param {any} store
 * @param {Key} key
 * @param {Subscriber} callback
 */
export function unsubscribe(store: any, key: Key, callback: Subscriber): void;
export type ArrayParameters = {
	array: any[];
	callback: string;
	state: State;
	prefix: string;
	value: any;
};
export type Key = number | string | symbol;
export type Subscriber = (value: any, origin?: string) => void;
export class State {}
export const name: 'template';

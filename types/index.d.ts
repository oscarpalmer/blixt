export type Data = {
	[index: number]: unknown;
	[key: string]: unknown;
};

export type Key = number | string | symbol;

declare class State {}

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

/**
 * A subscription to an observed function, which can be unsubscribed and resubscribed as needed.
 */
export declare class ObservableSubscription {
	private constructor();
	resubscribe(): void;
	unsubscribe(): void;
}

/**
 * - Observes changes for properties used in a function
 * - Returns a subscription that can be unsubscribed and resubscribed as needed
 */
export declare function observe(
	callback: () => unknown,
	after: (value: unknown) => unknown,
): ObservableSubscription;

/**
 * Creates a reactive store
 */
export declare function store<T extends Data>(data: T): Store<T>;

/**
 * A subscription to a keyed value in a store, which can be unsubscribed and resubscribed as needed.
 */
export declare class StoreSubscription {
	get key(): string;
	private constructor();
	resubscribe(): void;
	unsubscribe(): void;
}

/**
 * - Subscribes to value changes for a key in a store
 * - Returns a subscription that can be unsubscribed and resubscribed as needed
 */
export declare function subscribe<T extends Data>(
	store: Store<T>,
	key: Key,
	callback: Subscriber,
): StoreSubscription;

export declare class Template {
	/**
	 * Gets the template's ID
	 */
	get id(): Key | undefined;

	/**
	 * Creates a template
	 */
	constructor(strings: TemplateStringsArray, expressions: unknown[]);

	/**
	 * - Hydrates an existing node using the template and all its expressions
	 * - If a callback is provided, it will be called after the node has been successfully hydrated
	 */
	hydrate(node: Node, callback: ((node: Node) => void) | undefined): Node;

	/**
	 * Sets the template's ID to uniquely identify it in a list of templates
	 */
	identify(key: Key): this;

	/**
	 * Renders a template, on its own or for a parent
	 */
	render(parent?: ParentNode): Node;
}
/**
 * Creates a template
 */
export declare function template(
	strings: TemplateStringsArray,
	...expressions: unknown[]
): Template;

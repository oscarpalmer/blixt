export type Data = Record<number | string, unknown>;

export type Key = number | string | symbol;

declare class State {}

export type Subscriber = (
	/**
	 * New value for key in store
	 */
	newValue: unknown,
	/**
	 * Old value for key in store
	 */
	oldValue?: unknown,
	/**
	 * - Origin of value change
	 * - If a nested value is changed, its parents will receive the key as origin
	 */
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
	/**
	 * Function to observe
	 */
	callback: () => unknown,
	/**
	 * Callback to execute after the observed function is called
	 */
	after: (value: unknown) => unknown,
): ObservableSubscription;

/**
 * Creates a reactive store
 * @param data Original data object
 * @returns Reactive store
 */
export declare function store<T extends Data>(data: T): T;

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
	/**
	 * Reactive store
	 */
	store: T,
	/**
	 * Key to subscribe to
	 */
	key: Key,
	/**
	 * Callback to call when the value changes
	 */
	callback: Subscriber,
): StoreSubscription;

export declare class Template {
	/**
	 * Gets the template's ID
	 *
	 * @returns The template's ID (`undefined` if not set)
	 */
	get id(): Key | undefined;

	/**
	 * Creates a template
	 */
	constructor(strings: TemplateStringsArray, expressions: unknown[]);

	/**
	 * - Hydrates an existing node using the template and all its expressions
	 * - If a callback is provided, it will be called after the node has been successfully hydrated
	 *
	 * @param node Node to hydrate
	 * @param callback Callback to call after hydration
	 * @returns Hydrated node
	 */
	hydrate(node: Node, callback: ((node: Node) => void) | undefined): Node;

	/**
	 * Sets the template's ID to uniquely identify it in a list of templates
	 *
	 * @param key Template ID
	 * @returns The template
	 */
	identify(key: Key): this;

	/**
	 * Renders a template, on its own or for a parent
	 *
	 * @param parent Optional parent node to append the template to
	 * @returns Rendered template node (or the parent node if provided)
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

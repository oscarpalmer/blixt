export type Data = {
	[index: number]: any;
	[key: string]: any;
};

export type Key = number | string | symbol;

declare class State {}

export type Store<T extends Data> = {
	[K in keyof T]: T[K] extends Data ? Store<T[K]> : T[K];
} & Data;

export type Subscriber = (
	newValue: any,
	oldValue?: any,
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
	callback: () => any,
	after: (value: any) => any,
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
	constructor(strings: TemplateStringsArray, expressions: any[]);
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
	...expressions: any[]
): Template;

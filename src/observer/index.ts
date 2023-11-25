import {getString} from '@oscarpalmer/atoms';
import type {Data, Key, State} from '../models';
import {proxies, stateKey} from '../data';
import {StoreSubscription} from '../store/subscription';

type ObservableSubscriptionState = {
	active: boolean;
	after: (value: unknown) => unknown;
	subscriptions: Set<StoreSubscription>;
};

const observables = new WeakMap<() => any, Observable>();
const observers = new Map<symbol, Map<Data, Set<string>>>();
const parents = new WeakMap<ObservableSubscription, Observable>();

const states = new WeakMap<
	ObservableSubscription,
	ObservableSubscriptionState
>();

export class Observable {
	readonly subscriptions = new Set<ObservableSubscription>();

	private frame: number | undefined;
	private readonly id = Symbol(undefined);
	private observed = new Map<Data, Set<Key>>();
	private readonly onQueue = this.queue.bind(this);

	constructor(private readonly callback: () => any) {}

	subscribe(callback: (value: unknown) => unknown): ObservableSubscription {
		const subscription = new ObservableSubscription(this, callback);

		this.subscriptions.add(subscription);

		return subscription;
	}

	run(): void {
		observers.set(this.id, new Map());

		const value = this.callback() as unknown;

		const observed = observers.get(this.id) ?? new Map<Data, Set<Key>>();

		for (const subscription of this.subscriptions) {
			const state = states.get(subscription)!;

			if (state === undefined || !state.active) {
				continue;
			}

			for (const [proxy, keys] of this.observed) {
				const newKeys = observed.get(proxy) ?? new Set();

				for (const storeSubscription of state.subscriptions) {
					if (
						keys.has(storeSubscription.key) &&
						!newKeys.has(storeSubscription.key)
					) {
						storeSubscription.unsubscribe();

						state.subscriptions.delete(storeSubscription);
					}
				}
			}

			for (const [proxy, keys] of observed) {
				for (const key of keys) {
					if (
						!Array.from(state.subscriptions).some(
							storeSubscription => storeSubscription.key === key,
						)
					) {
						state.subscriptions.add(
							new StoreSubscription(
								proxy[stateKey] as State,
								key,
								this.onQueue,
							),
						);
					}
				}
			}

			state.after(value);
		}

		this.observed = observed;
	}

	private queue(): void {
		cancelAnimationFrame(this.frame!);

		this.frame = requestAnimationFrame(() => {
			this.frame = undefined;

			this.run();
		});
	}
}

/**
 * A subscription to an observed function, which can be unsubscribed and resubscribed as needed.
 */
export class ObservableSubscription {
	constructor(observable: Observable, after: (value: unknown) => unknown) {
		parents.set(this, observable);

		states.set(this, {
			after,
			active: true,
			subscriptions: new Set(),
		});
	}

	resubscribe(): void {
		manage('add', this);
	}

	unsubscribe(): void {
		manage('delete', this);
	}
}

function manage(
	type: 'add' | 'delete',
	subscription: ObservableSubscription,
): void {
	const add = type === 'add';

	const parent = parents.get(subscription);
	const state = states.get(subscription);

	if (parent === undefined || state === undefined || state.active === add) {
		return;
	}

	state.active = add;

	for (const storeSubscription of state.subscriptions) {
		storeSubscription[add ? 'resubscribe' : 'unsubscribe']();
	}

	parent.subscriptions[type](subscription);

	if (add) {
		parent.run();
	}
}

/**
 * - Observes changes for properties used in a function
 * - Returns a subscription that can be unsubscribed and resubscribed as needed
 * @param {() => any} callback Function to observe
 * @param {{(value: unknown) => unknown}=} after Callback to call after the function is called
 * @returns {ObservableSubscription} Subscription to the observation
 */
export function observe(
	callback: () => unknown,
	after: (value: unknown) => unknown,
): ObservableSubscription {
	if (typeof callback !== 'function') {
		throw new TypeError('Callback must be a function');
	}

	if (after !== undefined && typeof after !== 'function') {
		throw new TypeError('After-callback must be a function');
	}

	let observable = observables.get(callback);

	if (observable === undefined) {
		observable = new Observable(callback);

		observables.set(callback, observable);
	}

	const subscription = observable.subscribe(after);

	observable.run();

	return subscription;
}

export function observeKey(state: State, key: Key): void {
	const proxy = proxies.get(state)!;

	for (const [_, data] of observers) {
		const keys = data.get(proxy as never);

		if (keys === undefined) {
			data.set(proxy as never, new Set([getString(key)]));
		} else {
			keys.add(getString(key));
		}
	}
}

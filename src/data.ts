import type {State, Subscriber} from './models';
import type {ObservableSubscription} from './observer';

export const blixt = 'blixt';

export const comment = '<!--blixt-->';

export const documentFragmentConstructor = /^documentfragment$/i;

export const nodeSubscriptions = new WeakMap<
	Node,
	Set<ObservableSubscription>
>();

export const proxies = new WeakMap<State, ProxyConstructor>();

export const stateKey = '__state';

export const storeSubscriptions = new WeakMap<
	State,
	Map<string, Set<Subscriber>>
>();

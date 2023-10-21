import type {State, Subscriber} from './models';

export const blixt = 'blixt';

export const comment = `<!--${blixt}-->`;

export const proxies = new WeakMap<State, ProxyConstructor>();

export const stateKey = '__state';

export const subscriptions = new WeakMap<State, Map<string, Set<Subscriber>>>();

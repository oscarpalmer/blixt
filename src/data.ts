import type {EventExpression, State, Subscriber, TemplateData} from './models';
import type {ObservableSubscription} from './observer';
import type {Expression, Template} from './template';

export const blixt = 'blixt';

export const comment = '<!--blixt-->';

export const documentFragmentConstructor = /^documentfragment$/i;

export const nodeProperties = new WeakMap<
	Node,
	Map<string, Set<Expression> | Set<EventExpression>>
>();

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

export const templateData = new WeakMap<Template, TemplateData>();

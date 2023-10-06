import type {Data, Key, State, Store, Subscriber, TemplateData} from './models';
import type {Template} from './template';

export const blixt = 'blixt';

export const booleanAttributes = new Set([
	'checked',
	'disabled',
	'hidden',
	'inert',
	'multiple',
	'open',
	'readonly',
	'required',
	'selected',
]);

export const classAttributeExpression = /^class\./i;

export const comment = `<!--${blixt}-->`;

export const keyTypes = new Set<Key>(['number', 'string', 'symbol']);

export const observers = new Map<symbol, Map<Store<Data>, Set<Key>>>();

export const onAttributeExpression = /^on/i;

export const proxies = new WeakMap<State, ProxyConstructor>();

export const sourceAttributeNameExpression = /^(href|src|xlink:href)$/i;

export const sourceAttributeValueExpression = /(data:text\/html|javascript:)/i;

export const stateKey = '__state';

export const styleAttributeExpression = /^style\./i;

export const subscriptions = new WeakMap<State, Map<string, Set<Subscriber>>>();

export const templateData = new WeakMap<Template, TemplateData>();

export const valueAttributeExpression = /^value$/i;

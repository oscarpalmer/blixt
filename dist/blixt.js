/** @typedef {{[index: number]: unknown; [key: string]: unknown}} Data */
/** @typedef {{[Key in keyof Value]: Value[Key] extends unknown[] ? Value[Key] : Value[Key] extends Data ? Store<Value[Key]> : Value[Key]}} Store<Value> @template Value */
const blixt = 'blixt';
const comment = '<!--blixt-->';
const documentFragmentConstructor = /^documentfragment$/i;
const nodeItems = [];
const nodeProperties = new WeakMap();
const nodeSubscriptions = new WeakMap();
const proxies = new WeakMap();
const stateKey = '__state';
const storeSubscriptions = new WeakMap();
const templateData = new WeakMap();

const keyTypes = new Set(['number', 'string', 'symbol']);
function compareArrayOrder(first, second) {
    const target = first.length > second.length ? second : first;
    if (!(first.length > second.length ? first : second)
        .filter(key => target.includes(key))
        .every((key, index) => target[index] === key)) {
        return 'dissimilar';
    }
    return first.length > second.length ? 'removed' : 'added';
}
function getKey(...parts) {
    return parts
        .filter(part => part !== undefined)
        .map(part => getString(part).trim())
        .filter(part => part.length > 0)
        .join('.');
}
function getString(value) {
    return typeof value === 'string' ? value : String(value);
}
function getValue(data, key) {
    if (typeof data !== 'object') {
        return data;
    }
    const parts = key.split('.');
    let value = data;
    for (const part of parts) {
        value = value?.[part];
    }
    return value;
}
function isGenericObject(value) {
    return Array.isArray(value) || value?.constructor?.name === 'Object';
}
function isKey(value) {
    return keyTypes.has(typeof value);
}
function storeProperty(node, name, value) {
    const stored = nodeProperties.get(node);
    if (stored === undefined) {
        nodeProperties.set(node, new Map([[name, new Set([value])]]));
    }
    else {
        const named = stored.get(name);
        if (named === undefined) {
            stored.set(name, new Set([value]));
        }
        else {
            named.add(value);
        }
    }
}
function storeSubscription(element, subscription) {
    const subscriptions = nodeSubscriptions.get(element);
    if (subscriptions === undefined) {
        nodeSubscriptions.set(element, new Set([subscription]));
    }
    else if (!subscriptions.has(subscription)) {
        subscriptions.add(subscription);
    }
}

class State {
}

const states$1 = new WeakMap();
/**
 * A subscription to a keyed value in a store, which can be unsubscribed and resubscribed as needed.
 */
class StoreSubscription {
    get key() {
        return states$1.get(this).key;
    }
    constructor(state, key, callback) {
        if (!(state instanceof State)) {
            throw new TypeError('Store must be a store');
        }
        if (!isKey(key)) {
            throw new TypeError('Key must be a number, string, or symbol');
        }
        if (typeof callback !== 'function') {
            throw new TypeError('Callback must be a function');
        }
        const keyAsString = getString(key);
        states$1.set(this, {
            callback,
            key: keyAsString,
            value: state,
        });
        const stored = storeSubscriptions.get(state);
        const subs = stored.get(keyAsString);
        if (subs === undefined) {
            stored.set(keyAsString, new Set([callback]));
        }
        else if (!subs.has(callback)) {
            subs.add(callback);
        }
    }
    resubscribe() {
        manage$1('add', this);
    }
    unsubscribe() {
        manage$1('remove', this);
    }
}
function manage$1(type, subscription) {
    const state = states$1.get(subscription);
    if (state === undefined) {
        return;
    }
    const stored = storeSubscriptions.get(state.value);
    const subscribers = stored?.get(subscription.key);
    if (type === 'add' &&
        subscribers !== undefined &&
        !subscribers.has(state.callback)) {
        subscribers.add(state.callback);
    }
    else if (type === 'remove') {
        subscribers?.delete(state.callback);
    }
}
/**
 * - Subscribes to value changes for a key in a store
 * - Returns a subscription that can be unsubscribed and resubscribed as needed
 * @template {Data} T
 * @param {Store<T>} store
 * @param {number|string|symbol} key
 * @param {(newValue: unknown, oldValue?: unknown, origin?: string) => void} callback
 * @returns {StoreSubscription}
 */
function subscribe(store, key, callback) {
    return new StoreSubscription(store?.[stateKey], key, callback);
}

const observables = new WeakMap();
const observers = new Map();
const parents = new WeakMap();
const states = new WeakMap();
class Observable {
    constructor(callback) {
        this.callback = callback;
        this.subscriptions = new Set();
        this.id = Symbol(undefined);
        this.observed = new Map();
        this.onQueue = this.queue.bind(this);
    }
    subscribe(callback) {
        const subscription = new ObservableSubscription(this, callback);
        this.subscriptions.add(subscription);
        return subscription;
    }
    run() {
        observers.set(this.id, new Map());
        const value = this.callback();
        const observed = observers.get(this.id) ?? new Map();
        for (const subscription of this.subscriptions) {
            const state = states.get(subscription);
            if (state === undefined || !state.active) {
                continue;
            }
            for (const [proxy, keys] of this.observed) {
                const newKeys = observed.get(proxy) ?? new Set();
                for (const storeSubscription of state.subscriptions) {
                    if (keys.has(storeSubscription.key) &&
                        !newKeys.has(storeSubscription.key)) {
                        storeSubscription.unsubscribe();
                        state.subscriptions.delete(storeSubscription);
                    }
                }
            }
            for (const [proxy, keys] of observed) {
                for (const key of keys) {
                    if (!Array.from(state.subscriptions).some(storeSubscription => storeSubscription.key === key)) {
                        state.subscriptions.add(new StoreSubscription(proxy[stateKey], key, this.onQueue));
                    }
                }
            }
            state.after(value);
        }
        this.observed = observed;
    }
    queue() {
        cancelAnimationFrame(this.frame);
        this.frame = requestAnimationFrame(() => {
            this.frame = undefined;
            this.run();
        });
    }
}
/**
 * A subscription to an observed function, which can be unsubscribed and resubscribed as needed.
 */
class ObservableSubscription {
    constructor(observable, after) {
        parents.set(this, observable);
        states.set(this, {
            after,
            active: true,
            subscriptions: new Set(),
        });
    }
    resubscribe() {
        manage('add', this);
    }
    unsubscribe() {
        manage('delete', this);
    }
}
function manage(type, subscription) {
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
 * @param {() => any} callback
 * @param {{(value: unknown) => unknown}=} after
 * @returns {ObservableSubscription}
 */
function observe(callback, after) {
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
function observeKey(state, key) {
    const proxy = proxies.get(state);
    for (const [_, data] of observers) {
        const keys = data.get(proxy);
        if (keys === undefined) {
            data.set(proxy, new Set([getString(key)]));
        }
        else {
            keys.add(getString(key));
        }
    }
}

function emit(state, prefix, properties, values) {
    const proxy = proxies.get(state);
    const keys = properties.map(property => getKey(prefix, property));
    const origin = properties.length > 1 ? prefix : keys[0];
    if (prefix !== undefined) {
        const parts = prefix.split('.');
        keys.push(...parts
            .map((_, index) => parts.slice(0, index + 1).join('.'))
            .reverse());
    }
    for (const key of keys) {
        emitValue({ key, keys, origin, prefix, proxy, state, values });
    }
}
function emitValue(parameters) {
    const { state, key, origin, proxy, keys, values } = parameters;
    const subscribers = storeSubscriptions.get(state)?.get(key);
    if (subscribers === undefined) {
        return;
    }
    const callbacks = Array.from(subscribers);
    const emitOrigin = key === origin ? undefined : origin;
    const newValue = getValue(proxy, key);
    const oldValue = (values[keys.indexOf(key)] ?? undefined);
    for (const callback of callbacks) {
        callback(newValue, oldValue, emitOrigin);
    }
}

function createStore(data, state, prefix) {
    if (isStore(data) || !isGenericObject(data)) {
        return data;
    }
    const isArray = Array.isArray(data);
    const isParent = !(state instanceof State);
    const proxyState = isParent ? new State() : state;
    const proxyValue = transformData(proxyState, prefix, data, isArray);
    const proxy = new Proxy(proxyValue, {
        get(target, property) {
            if (property === stateKey) {
                return proxyState;
            }
            observeKey(proxyState, getKey(prefix, property));
            const value = Reflect.get(target, property);
            if (isArray && property in Array.prototype) {
                return handleArray({
                    value,
                    array: proxyValue,
                    callback: getString(property),
                    prefix: prefix ?? '',
                    state: proxyState,
                });
            }
            return value;
        },
        has(target, property) {
            return property === stateKey || Reflect.has(target, property);
        },
        set(target, property, value) {
            const oldValue = Reflect.get(target, property);
            const newValue = transformItem(proxyState, prefix, property, value);
            return Reflect.set(target, property, newValue)
                ? setValue({ newValue, oldValue, prefix, property, state: proxyState })
                : false;
        },
    });
    Object.defineProperty(proxy, stateKey, {
        value: proxyState,
        writable: false,
    });
    if (isParent) {
        proxies.set(proxyState, proxy);
        storeSubscriptions.set(proxyState, new Map());
    }
    return proxy;
}
function handleArray(parameters) {
    const { array, callback, state, prefix } = parameters;
    function synthetic(...args) {
        const oldArray = array.slice(0);
        const result = Array.prototype[callback].apply(array, args);
        const properties = [];
        const values = [];
        for (const item of oldArray) {
            const index = oldArray.indexOf(item);
            if (item !== array[index]) {
                properties.push(index);
                values.push(oldArray[index]);
            }
        }
        for (let index = oldArray.length; index < array.length; index += 1) {
            properties.push(index);
        }
        emit(state, prefix, properties, values);
        return result;
    }
    switch (callback) {
        case 'copyWithin':
        case 'pop':
        case 'reverse':
        case 'shift':
        case 'sort': {
            return synthetic;
        }
        case 'fill':
        case 'push':
        case 'unshift': {
            return (...items) => synthetic(...transformData(state, prefix, items, true));
        }
        case 'splice': {
            return (start, remove, ...items) => synthetic(start, remove, ...transformData(state, prefix, items, true));
        }
        default: {
            return parameters.value;
        }
    }
}
function isStore(value) {
    return value?.[stateKey] instanceof State;
}
function setValue(parameters) {
    const { newValue, oldValue, prefix, property, state } = parameters;
    let properties;
    let values;
    if (isStore(oldValue)) {
        properties = [];
        values = [];
        const oldKeys = Object.keys(oldValue);
        const newKeys = Object.keys(newValue);
        for (const key of oldKeys) {
            if (oldValue[key] !== newValue[key]) {
                properties.push(key);
                values.push(oldValue[key]);
            }
        }
        for (const key of newKeys) {
            if (!(key in oldValue)) {
                properties.push(key);
            }
        }
    }
    emit(state, properties === undefined ? prefix : getKey(prefix, property), properties ?? [property], values ?? [oldValue]);
    return true;
}
/**
 * Creates a reactive store
 * @template {Data} T
 * @param {T} data
 * @returns {Store<T>}
 */
function store(data) {
    if (typeof data !== 'object') {
        throw new TypeError('Data must be an object');
    }
    return createStore(data);
}
function transformData(state, prefix, data, isArray) {
    const value = (isArray ? [] : Object.create(data, {}));
    for (const key in data) {
        if (key in data) {
            value[key] = transformItem(state, prefix, key, data[key]);
        }
    }
    return value;
}
function transformItem(state, prefix, key, value) {
    return typeof value === 'object' && value !== null
        ? createStore(value, state, getKey(prefix, key))
        : value;
}

function getObservedItem(value) {
    return {
        identifier: value instanceof Template ? value.id : undefined,
        nodes: getObservedItems(createNode(value)).flatMap(item => item.nodes),
    };
}
function getObservedItems(value) {
    return (Array.isArray(value) ? value : [value])
        .filter(item => item instanceof Node)
        .map(item => documentFragmentConstructor.test(item.constructor.name)
        ? Array.from(item.childNodes)
        : [item])
        .map(items => ({ nodes: items }));
}

function observeContent(comment, expression) {
    let index;
    let isText = false;
    observe(expression.value, value => {
        const items = index === undefined ? undefined : nodeItems[index];
        const isArray = Array.isArray(value);
        if (value === undefined || value === null || isArray) {
            isText = false;
            index = setContent(index, isArray && value.length > 0
                ? updateArray(comment, items, value)
                : items === undefined
                    ? undefined
                    : replaceNodes(items, [{ nodes: [comment] }], false));
            return;
        }
        const node = createNode(value);
        if (items !== undefined && isText && node instanceof Text) {
            if (items[0].nodes[0].textContent !== node.textContent) {
                items[0].nodes[0].textContent = node.textContent;
            }
            return;
        }
        isText = node instanceof Text;
        index = setContent(index, replaceNodes(items ?? [{ nodes: [comment] }], getObservedItems(node), true));
    });
}
function setContent(index, items) {
    if (items === undefined) {
        if (index !== undefined) {
            nodeItems.splice(index, 1);
        }
        return undefined;
    }
    if (index === undefined) {
        return nodeItems.push(items) - 1;
    }
    nodeItems.splice(index, 1, items);
    return index;
}
function updateArray(comment, current, array) {
    let templated = array.filter(item => item instanceof Template && item.id !== undefined);
    const identifiers = templated.map(template => template.id);
    if (new Set(identifiers).size !== array.length) {
        templated = [];
    }
    if (current === undefined || templated.length === 0) {
        return replaceNodes(current ?? [{ nodes: [comment] }], templated.length > 0
            ? templated.map(template => getObservedItem(template))
            : getObservedItems(array.map(item => createNode(item))), true);
    }
    const observed = [];
    for (const template of templated) {
        observed.push(current.find(item => item.identifier === template.id) ??
            getObservedItem(template));
    }
    const oldIdentifiers = current.map(item => item.identifier);
    const compared = compareArrayOrder(oldIdentifiers, identifiers);
    let position = current[0].nodes[0];
    if (compared !== 'removed') {
        const items = observed.flatMap(item => item.nodes.map(node => ({
            id: item.identifier,
            value: node,
        })));
        const before = compared === 'added' && !oldIdentifiers.includes(identifiers[0]);
        for (const item of items) {
            if (compared === 'dissimilar' || !oldIdentifiers.includes(item.id)) {
                if (items.indexOf(item) === 0 && before) {
                    position.before(item.value);
                }
                else {
                    position.after(item.value);
                }
            }
            position = item.value;
        }
    }
    const nodes = current
        .filter(item => !identifiers.includes(item.identifier))
        .flatMap(item => item.nodes);
    cleanNodes(nodes, true);
    for (const node of nodes) {
        node.remove();
    }
    return observed;
}

function addEvent(element, attribute, expression) {
    const { name, options } = getEventParameters(attribute);
    element.addEventListener(name, expression.value, options);
    element.removeAttribute(attribute);
    storeProperty(element, attribute, { expression, options });
}
function getEventParameters(attribute) {
    let name = attribute.slice(1);
    const options = {
        passive: true,
    };
    if (name.includes(':')) {
        const [event, ...items] = name.split(':');
        name = event;
        const normalised = new Set(items.map(item => item.toLowerCase()));
        options.capture = normalised.has('capture');
        options.once = normalised.has('once');
        options.passive = !normalised.has('active');
    }
    return {
        name,
        options,
    };
}
function removeEvents(element) {
    const stored = nodeProperties.get(element) ?? new Map();
    for (const [name, events] of stored) {
        for (const event of events) {
            if (!(event instanceof Expression)) {
                element.removeEventListener(name.slice(1), event.expression.value, event.options);
            }
        }
        if (events.size === 0) {
            stored.delete(name);
        }
    }
    if (stored.size === 0) {
        nodeProperties.delete(element);
    }
}

const booleanAttributes = new Set([
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
const classAttributeExpression = /^class\./i;
const styleAttributeExpression = /^style\./i;
const valueAttributeExpression = /^value$/i;
function observeAttribute(element, attribute, expression) {
    const isBoolean = booleanAttributes.has(attribute.toLowerCase());
    const isClass = classAttributeExpression.test(attribute);
    const isStyle = styleAttributeExpression.test(attribute);
    let callback = observeValueAttribute;
    if (isBoolean || isClass || isStyle) {
        element.removeAttribute(attribute);
        callback = isBoolean
            ? observeBooleanAttribute
            : isClass
                ? observeClassAttribute
                : observeStyleAttribute;
    }
    const subscription = callback(element, attribute, expression);
    if (subscription !== undefined) {
        storeProperty(element, attribute, expression);
        storeSubscription(element, subscription);
    }
}
function observeBooleanAttribute(element, name, expression) {
    return observe(expression.value, value => {
        const isBoolean = typeof value === 'boolean';
        if (value === undefined || value === null || isBoolean) {
            element[name] = isBoolean ? value : false;
        }
    });
}
function observeClassAttribute(element, name, expression) {
    const classes = name
        .split('.')
        .slice(1)
        .map(name => name.trim())
        .filter(name => name.length > 0);
    if (classes.length === 0) {
        return;
    }
    return observe(expression.value, value => {
        if (value === true) {
            element.classList.add(...classes);
        }
        else {
            element.classList.remove(...classes);
        }
    });
}
function observeStyleAttribute(element, name, expression) {
    const [, first, second] = name.split('.');
    const property = first.trim();
    const suffix = second?.trim();
    if (property.length === 0 || (suffix !== undefined && suffix.length === 0)) {
        return;
    }
    return observe(expression.value, value => {
        if (value === undefined ||
            value === null ||
            value === false ||
            (value === true && suffix === undefined)) {
            element.style.removeProperty(property);
        }
        else {
            element.style.setProperty(property, value === true ? suffix : `${value}${suffix ?? ''}`);
        }
    });
}
function observeValueAttribute(element, name, expression) {
    const isValueAttribute = valueAttributeExpression.test(name);
    return observe(expression.value, value => {
        if (isValueAttribute) {
            element.value = value;
        }
        if (value === undefined || value === null) {
            element.removeAttribute(name);
        }
        else {
            element.setAttribute(name, value);
        }
    });
}

const onAttributeExpression = /^on/i;
const sourceAttributeNameExpression = /^(href|src|xlink:href)$/i;
const sourceAttributeValueExpression = /(data:text\/html|javascript:)/i;
function isBadAttribute(attribute) {
    const { name, value } = attribute;
    return (onAttributeExpression.test(name) ||
        (sourceAttributeNameExpression.test(name) &&
            sourceAttributeValueExpression.test(value)));
}
function mapAttributes(element, expressions) {
    const attributes = Array.from(element.attributes);
    for (const attribute of attributes) {
        const { name, value } = attribute;
        const expression = value === comment ? expressions.values[expressions.index++] : undefined;
        const badAttribute = isBadAttribute(attribute);
        if (badAttribute ||
            !(expression instanceof Expression) ||
            !(element instanceof HTMLElement || element instanceof SVGElement)) {
            if (badAttribute) {
                element.removeAttribute(name);
            }
            continue;
        }
        if (name.startsWith('@')) {
            addEvent(element, attribute.name, expression);
        }
        else {
            observeAttribute(element, attribute.name, expression);
        }
    }
}

function cleanNodes(nodes, removeSubscriptions) {
    for (const node of nodes) {
        removeEvents(node);
        nodeProperties.delete(node);
        if (removeSubscriptions) {
            const subscriptions = nodeSubscriptions.get(node) ?? [];
            for (const subscription of subscriptions) {
                subscription.unsubscribe();
            }
            nodeSubscriptions.delete(node);
        }
        if (node.hasChildNodes()) {
            cleanNodes(Array.from(node.childNodes), removeSubscriptions);
        }
    }
}
function createNode(value) {
    if (value instanceof Node) {
        return value;
    }
    return value instanceof Template
        ? value.render()
        : document.createTextNode(getString(value));
}
function createNodes(html) {
    const element = document.createElement('template');
    element.innerHTML = html;
    const fragment = element.content.cloneNode(true);
    const scripts = Array.from(fragment.querySelectorAll('script'));
    for (const script of scripts) {
        script.remove();
    }
    fragment.normalize();
    return fragment;
}
function mapNodes(data, template, node) {
    const { expressions } = data.get(template);
    const children = Array.from(node.childNodes);
    for (const child of children) {
        if (child.nodeType === 8 && child.nodeValue === blixt) {
            setNode(child, expressions.values[expressions.index++]);
            continue;
        }
        if (child instanceof Element) {
            mapAttributes(child, expressions);
        }
        if (child.hasChildNodes()) {
            mapNodes(data, template, child);
        }
    }
    return node;
}
function replaceNodes(from, to, set) {
    const nodes = (from ?? []).flatMap(item => item.nodes);
    cleanNodes(nodes, true);
    for (const node of nodes) {
        if (nodes.indexOf(node) === 0) {
            node.before(...to.flatMap(item => item.nodes));
        }
        node.remove();
    }
    return set ? to : undefined;
}
function setNode(comment, value) {
    if (value instanceof Expression) {
        observeContent(comment, value);
        return;
    }
    const node = createNode(value);
    comment.replaceWith(...(documentFragmentConstructor.test(node.constructor.name)
        ? Array.from(node.childNodes)
        : [node]));
}

function compareNode(first, second, pairs) {
    first.normalize();
    second.normalize();
    const firstChildren = Array.from(first.childNodes).filter(child => isValidNode(child));
    const secondChildren = Array.from(second.childNodes).filter(child => isValidNode(child));
    const { length } = firstChildren;
    if (length !== secondChildren.length) {
        console.warn('Nodes do not have same number of children');
        return false;
    }
    if (length === 0) {
        const valid = first.isEqualNode(second);
        if (valid) {
            pairs.push({ first, second });
        }
        else {
            console.warn('Nodes are not equal');
        }
        return valid;
    }
    for (let index = 0; index < length; index += 1) {
        if (!compareNode(firstChildren[index], secondChildren[index], pairs)) {
            return false;
        }
    }
    pairs.push({ first, second });
    return true;
}
function hydrate(node, template, callback) {
    const rendered = render(template);
    const pairs = [];
    if (normaliseContent(node) !== normaliseContent(rendered) ||
        !compareNode(node, rendered, pairs)) {
        console.warn('Unable to hydrate existing content');
        return node;
    }
    for (const pair of pairs) {
        hydrateContent(pair);
        hydrateProperties(pair);
        hydrateSubscriptions(pair);
    }
    cleanNodes([rendered], false);
    if (typeof callback === 'function') {
        callback(node);
    }
    return node;
}
function hydrateContent(pair) {
    const item = nodeItems
        .find(items => items.some(item => item.nodes.includes(pair.second)))
        ?.find(item => item.nodes.includes(pair.second));
    if (item === undefined) {
        return;
    }
    const index = item.nodes.indexOf(pair.second);
    if (index > -1) {
        item.nodes.splice(index, 1, pair.first);
    }
}
function hydrateProperties(pair) {
    const properties = nodeProperties.get(pair.second) ?? [];
    for (const [name, items] of properties) {
        for (const item of items) {
            if (item instanceof Expression) {
                observeAttribute(pair.first, name, item);
            }
            else {
                addEvent(pair.first, name, item.expression);
            }
        }
    }
}
function hydrateSubscriptions(pair) {
    const subscriptions = nodeSubscriptions.get(pair.second) ?? new Set();
    if (subscriptions.size > 0) {
        nodeSubscriptions.set(pair.first, subscriptions);
    }
    nodeSubscriptions.delete(pair.second);
}
function isValidNode(node) {
    if (node instanceof Text) {
        return (node?.textContent ?? '').trim().length > 0;
    }
    return node instanceof Element ? !/^script$/i.test(node.tagName) : true;
}
function normaliseContent(node) {
    return (node?.textContent ?? '').replaceAll(/\s+/g, ' ').trim();
}

class Expression {
    get value() {
        return this.callback;
    }
    constructor(callback) {
        this.callback = callback;
    }
}
class Template {
    /**
     * Gets the template's ID
     * @returns {(number|string|symbol)=}
     */
    get id() {
        return this.identifier;
    }
    /**
     * Creates a template
     * @param {TemplateStringsArray} strings
     * @param {...any} expressions
     */
    constructor(strings, expressions) {
        templateData.set(this, {
            strings,
            expressions: {
                index: 0,
                original: expressions ?? [],
                values: [],
            },
        });
    }
    /**
     * - Hydrates an existing node using the template and all its expressions
     * - If a callback is provided, it will be called after the node has been successfully hydrated
     *
     * @param {Node} node
     * @param {((node: Node) => void)=} callback
     * @returns {Node}
     */
    hydrate(node, callback) {
        return hydrate(node, this, callback);
    }
    /**
     * Sets the template's ID to uniquely identify it in a list of templates
     * @param {number|string|symbol} key
     * @returns {Template}
     */
    identify(key) {
        if (this.identifier === undefined && isKey(key)) {
            this.identifier = key;
        }
        return this;
    }
    /**
     * Renders a template, on its own or for a parent
     * @param {ParentNode=} parent
     * @returns {Node}
     */
    render(parent) {
        const rendered = render(this);
        parent?.append(rendered);
        return parent ?? rendered;
    }
}
function render(template) {
    const asString = toString(template);
    const nodes = createNodes(asString);
    return mapNodes(templateData, template, nodes);
}
/**
 * Creates a template
 */
function template(strings, ...expressions) {
    return new Template(strings, expressions);
}
function toString(template) {
    const { strings, expressions } = templateData.get(template);
    function express(value, expression) {
        const isFunction = typeof expression === 'function';
        if (isFunction ||
            expression instanceof Node ||
            expression instanceof Template) {
            expressions.values.push((isFunction
                ? new Expression(expression)
                : expression));
            return value + comment;
        }
        if (Array.isArray(expression)) {
            let expressed = '';
            for (const exp of expression) {
                expressed += express('', exp);
            }
            return value + expressed;
        }
        return value + getString(expression);
    }
    let html = '';
    for (let index = 0; index < strings.length; index += 1) {
        const value = strings[index];
        const expression = expressions.original[index];
        html += expression === undefined ? value : express(value, expression);
    }
    return html;
}

export { observe, store, subscribe, template };

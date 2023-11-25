// node_modules/@oscarpalmer/atoms/dist/js/atoms.js
var getValue = function(data, key) {
  if (typeof data !== "object" || data === null || isNullableOrWhitespace(key)) {
    return;
  }
  const parts = getString(key).split(".");
  const length = parts.length;
  let index = 0;
  let value = data;
  while (typeof value === "object" && value !== null && index < length) {
    value = value[parts[index++]];
  }
  return value;
};
var isNullable = function(value) {
  return value === undefined || value === null;
};
var createUuid = function() {
  return uuidTemplate.replace(/[018]/g, (substring) => (substring ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> substring / 4).toString(16));
};
var getString = function(value2) {
  return typeof value2 === "string" ? value2 : String(value2);
};
var isNullableOrWhitespace = function(value2) {
  return isNullable(value2) || getString(value2).trim().length === 0;
};
var uuidTemplate = "10000000-1000-4000-8000-100000000000";

// src/data.ts
var blixt = "blixt";
var comment = "<!--blixt-->";
var documentFragmentConstructor = /^documentfragment$/i;
var nodeItems = new Map;
var nodeProperties = new WeakMap;
var nodeSubscriptions = new WeakMap;
var proxies = new WeakMap;
var stateKey = "__state__";
var storeSubscriptions = new WeakMap;
var templateData = new WeakMap;

// src/models.ts
class State {
}

// src/helpers/index.ts
function compareArrayOrder(first, second) {
  const target = first.length > second.length ? second : first;
  if (!(first.length > second.length ? first : second).filter((key) => target.includes(key)).every((key, index) => target[index] === key)) {
    return "dissimilar";
  }
  return first.length > second.length ? "removed" : "added";
}
function getKey(...parts) {
  return parts.filter((part) => part !== undefined).map((part) => getString(part).trim()).filter((part) => part.length > 0).join(".");
}
function isGenericObject(value) {
  return Array.isArray(value) || value?.constructor?.name === "Object";
}
function isKey(value) {
  return keyTypes.has(typeof value);
}
function storeProperty(node, name, value) {
  const stored = nodeProperties.get(node);
  if (stored === undefined) {
    nodeProperties.set(node, new Map([[name, new Set([value])]]));
  } else {
    const named = stored.get(name);
    if (named === undefined) {
      stored.set(name, new Set([value]));
    } else {
      named.add(value);
    }
  }
}
function storeSubscription(element, subscription) {
  const subscriptions = nodeSubscriptions.get(element);
  if (subscriptions === undefined) {
    nodeSubscriptions.set(element, new Set([subscription]));
  } else if (!subscriptions.has(subscription)) {
    subscriptions.add(subscription);
  }
}
var keyTypes = new Set(["number", "string", "symbol"]);

// src/store/subscription.ts
var manage = function(type, subscription) {
  const state = states.get(subscription);
  if (state === undefined) {
    return;
  }
  const stored = storeSubscriptions.get(state.value);
  const subscribers = stored?.get(subscription.key);
  if (type === "add" && subscribers !== undefined && !subscribers.has(state.callback)) {
    subscribers.add(state.callback);
  } else if (type === "remove") {
    subscribers?.delete(state.callback);
  }
};
function subscribe(store, key, callback) {
  return new StoreSubscription(store?.[stateKey], key, callback);
}
var states = new WeakMap;

class StoreSubscription {
  get key() {
    return states.get(this).key;
  }
  constructor(state, key, callback) {
    if (!(state instanceof State)) {
      throw new TypeError("Store must be a store");
    }
    if (!isKey(key)) {
      throw new TypeError("Key must be a number, string, or symbol");
    }
    if (typeof callback !== "function") {
      throw new TypeError("Callback must be a function");
    }
    const keyAsString = getString(key);
    states.set(this, {
      callback,
      key: keyAsString,
      value: state
    });
    const stored = storeSubscriptions.get(state);
    const subs = stored.get(keyAsString);
    if (subs === undefined) {
      stored.set(keyAsString, new Set([callback]));
    } else if (!subs.has(callback)) {
      subs.add(callback);
    }
  }
  resubscribe() {
    manage("add", this);
  }
  unsubscribe() {
    manage("remove", this);
  }
}

// src/observer/index.ts
var manage2 = function(type, subscription2) {
  const add = type === "add";
  const parent = parents.get(subscription2);
  const state = states2.get(subscription2);
  if (parent === undefined || state === undefined || state.active === add) {
    return;
  }
  state.active = add;
  for (const storeSubscription2 of state.subscriptions) {
    storeSubscription2[add ? "resubscribe" : "unsubscribe"]();
  }
  parent.subscriptions[type](subscription2);
  if (add) {
    parent.run();
  }
};
function observe(callback, after) {
  if (typeof callback !== "function") {
    throw new TypeError("Callback must be a function");
  }
  if (after !== undefined && typeof after !== "function") {
    throw new TypeError("After-callback must be a function");
  }
  let observable = observables.get(callback);
  if (observable === undefined) {
    observable = new Observable(callback);
    observables.set(callback, observable);
  }
  const subscription2 = observable.subscribe(after);
  observable.run();
  return subscription2;
}
function observeKey(state, key) {
  const proxy = proxies.get(state);
  for (const [_, data4] of observers) {
    const keys = data4.get(proxy);
    if (keys === undefined) {
      data4.set(proxy, new Set([getString(key)]));
    } else {
      keys.add(getString(key));
    }
  }
}
var observables = new WeakMap;
var observers = new Map;
var parents = new WeakMap;
var states2 = new WeakMap;

class Observable {
  callback;
  subscriptions = new Set;
  frame;
  id = Symbol(undefined);
  observed = new Map;
  onQueue = this.queue.bind(this);
  constructor(callback) {
    this.callback = callback;
  }
  subscribe(callback) {
    const subscription2 = new ObservableSubscription(this, callback);
    this.subscriptions.add(subscription2);
    return subscription2;
  }
  run() {
    observers.set(this.id, new Map);
    const value = this.callback();
    const observed = observers.get(this.id) ?? new Map;
    for (const subscription2 of this.subscriptions) {
      const state = states2.get(subscription2);
      if (state === undefined || !state.active) {
        continue;
      }
      for (const [proxy, keys] of this.observed) {
        const newKeys = observed.get(proxy) ?? new Set;
        for (const storeSubscription2 of state.subscriptions) {
          if (keys.has(storeSubscription2.key) && !newKeys.has(storeSubscription2.key)) {
            storeSubscription2.unsubscribe();
            state.subscriptions.delete(storeSubscription2);
          }
        }
      }
      for (const [proxy, keys] of observed) {
        for (const key of keys) {
          if (!Array.from(state.subscriptions).some((storeSubscription2) => storeSubscription2.key === key)) {
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

class ObservableSubscription {
  constructor(observable, after) {
    parents.set(this, observable);
    states2.set(this, {
      after,
      active: true,
      subscriptions: new Set
    });
  }
  resubscribe() {
    manage2("add", this);
  }
  unsubscribe() {
    manage2("delete", this);
  }
}
// src/store/emit.ts
function emit(state, prefix, properties, values) {
  const proxy = proxies.get(state);
  const keys = properties.map((property) => getKey(prefix, property));
  const origin = properties.length > 1 ? prefix : keys[0];
  if (prefix !== undefined) {
    const parts = prefix.split(".");
    keys.push(...parts.map((_, index) => parts.slice(0, index + 1).join(".")).reverse());
  }
  for (const key of keys) {
    emitValue({ key, keys, origin, prefix, proxy, state, values });
  }
}
var emitValue = function(parameters) {
  const { state, key, origin, proxy, keys, values } = parameters;
  const subscribers = storeSubscriptions.get(state)?.get(key);
  if (subscribers === undefined) {
    return;
  }
  const callbacks = Array.from(subscribers);
  const emitOrigin = key === origin ? undefined : origin;
  const newValue = getValue(proxy, key);
  const oldValue = values[keys.indexOf(key)] ?? undefined;
  for (const callback of callbacks) {
    callback(newValue, oldValue, emitOrigin);
  }
};

// src/store/index.ts
function createStore(data6, state, prefix) {
  if (isStore(data6) || !isGenericObject(data6)) {
    return data6;
  }
  const isArray = Array.isArray(data6);
  const isParent = !(state instanceof State);
  const proxyState = isParent ? new State : state;
  const proxyValue = transformData(proxyState, prefix, data6, isArray);
  const proxy = new Proxy(proxyValue, {
    get(target, property) {
      if (property === stateKey) {
        return proxyState;
      }
      observeKey(proxyState, getKey(prefix, property));
      const value = Reflect.get(target, property);
      if (isArray && (property in Array.prototype)) {
        return handleArray({
          value,
          array: proxyValue,
          callback: getString(property),
          prefix: prefix ?? "",
          state: proxyState
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
      return Reflect.set(target, property, newValue) ? setValue({ newValue, oldValue, prefix, property, state: proxyState }) : false;
    }
  });
  Object.defineProperty(proxy, stateKey, {
    value: proxyState,
    writable: false
  });
  if (isParent) {
    proxies.set(proxyState, proxy);
    storeSubscriptions.set(proxyState, new Map);
  }
  return proxy;
}
var handleArray = function(parameters) {
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
    for (let index = oldArray.length;index < array.length; index += 1) {
      properties.push(index);
    }
    emit(state, prefix, properties, values);
    return result;
  }
  switch (callback) {
    case "copyWithin":
    case "pop":
    case "reverse":
    case "shift":
    case "sort": {
      return synthetic;
    }
    case "fill":
    case "push":
    case "unshift": {
      return (...items) => synthetic(...transformData(state, prefix, items, true));
    }
    case "splice": {
      return (start, remove, ...items) => synthetic(start, remove, ...transformData(state, prefix, items, true));
    }
    default: {
      return parameters.value;
    }
  }
};
var isStore = function(value) {
  return value?.[stateKey] instanceof State;
};
var setValue = function(parameters) {
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
};
/**
 * @template {Record<number | string, unknown>} T
 * @param {T} data
 * @returns {T}
 */
function store(data) {
  if (typeof data !== "object") {
    throw new TypeError("Data must be an object");
  }
  return createStore(data);
}
var transformData = function(state, prefix, data6, isArray) {
  const value = isArray ? [] : Object.create(data6, {});
  for (const key in data6) {
    if (key in data6) {
      value[key] = transformItem(state, prefix, key, data6[key]);
    }
  }
  return value;
};
var transformItem = function(state, prefix, key, value) {
  return typeof value === "object" && value !== null ? createStore(value, state, getKey(prefix, key)) : value;
};
// src/helpers/dom/index.ts
function getObservedItem(value) {
  return {
    identifier: value instanceof Template ? value.id : undefined,
    nodes: getObservedItems(createNode(value)).flatMap((item) => item.nodes)
  };
}
function getObservedItems(value) {
  return (Array.isArray(value) ? value : [value]).filter((item) => item instanceof Node).map((item) => documentFragmentConstructor.test(item.constructor.name) ? Array.from(item.childNodes) : [item]).map((items) => ({ nodes: items }));
}

// src/observer/content.ts
function observeContent(comment2, expression) {
  let id;
  let isText = false;
  observe(expression.value, (value) => {
    const items = id === undefined ? undefined : nodeItems.get(id);
    const isArray = Array.isArray(value);
    if (value === undefined || value === null || isArray) {
      isText = false;
      id = setNodeItems(id, isArray && value.length > 0 ? updateArray(comment2, items, value) : items === undefined ? undefined : replaceNodes(items, [{ nodes: [comment2] }], false));
      return;
    }
    const node3 = createNode(value);
    if (items !== undefined && isText && node3 instanceof Text) {
      if (items[0].nodes[0].textContent !== node3.textContent) {
        items[0].nodes[0].textContent = node3.textContent;
      }
      return;
    }
    isText = node3 instanceof Text;
    id = setNodeItems(id, replaceNodes(items ?? [{ nodes: [comment2] }], getObservedItems(node3), true));
  });
}
function removeNodeItems(node3) {
  for (const [id, items] of nodeItems) {
    for (const item of items) {
      if (item.nodes.includes(node3)) {
        item.nodes.splice(item.nodes.indexOf(node3), 1);
      }
    }
    if (items.flatMap((item) => item.nodes).length === 0) {
      nodeItems.delete(id);
    }
  }
}
var setNodeItems = function(id, items) {
  if (items === undefined) {
    if (id !== undefined) {
      nodeItems.delete(id);
    }
    return;
  }
  id ??= createUuid();
  nodeItems.set(id, items);
  return id;
};
function updateArray(comment2, current, array) {
  let templated = array.filter((item) => item instanceof Template && item.id !== undefined);
  const identifiers = templated.map((template3) => template3.id);
  if (new Set(identifiers).size !== array.length) {
    templated = [];
  }
  if (current === undefined || templated.length === 0) {
    return replaceNodes(current ?? [{ nodes: [comment2] }], templated.length > 0 ? templated.map((template3) => getObservedItem(template3)) : getObservedItems(array.map((item) => createNode(item))), true);
  }
  const observed = [];
  for (const template3 of templated) {
    observed.push(current.find((item) => item.identifier === template3.id) ?? getObservedItem(template3));
  }
  const oldIdentifiers = current.map((item) => item.identifier);
  const compared = compareArrayOrder(oldIdentifiers, identifiers);
  let position = current[0].nodes[0];
  if (compared !== "removed") {
    const items = observed.flatMap((item) => item.nodes.map((node3) => ({
      id: item.identifier,
      value: node3
    })));
    const before = compared === "added" && !oldIdentifiers.includes(identifiers[0]);
    for (const item of items) {
      if (compared === "dissimilar" || !oldIdentifiers.includes(item.id)) {
        if (items.indexOf(item) === 0 && before) {
          position.before(item.value);
        } else {
          position.after(item.value);
        }
      }
      position = item.value;
    }
  }
  const nodes = current.filter((item) => !identifiers.includes(item.identifier)).flatMap((item) => item.nodes);
  cleanNodes(nodes, true);
  for (const node3 of nodes) {
    node3.remove();
  }
  return observed;
}

// src/helpers/events.ts
function addEvent(element, attribute, expression) {
  const { name, options } = getEventParameters(attribute);
  element.addEventListener(name, expression.value, options);
  element.removeAttribute(attribute);
  storeProperty(element, attribute, { expression, options });
}
function getEventParameters(attribute) {
  let name = attribute.slice(1);
  const options = {
    passive: true
  };
  if (name.includes(":")) {
    const [event, ...items] = name.split(":");
    name = event;
    const normalised = new Set(items.map((item) => item.toLowerCase()));
    options.capture = normalised.has("capture");
    options.once = normalised.has("once");
    options.passive = !normalised.has("active");
  }
  return {
    name,
    options
  };
}
function removeEvents(element) {
  const stored = nodeProperties.get(element) ?? new Map;
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

// src/observer/attribute.ts
function observeAttribute(element, attribute, expression) {
  const isBoolean = booleanAttributes.has(attribute.toLowerCase());
  const isClass = classAttributeExpression.test(attribute);
  const isStyle = styleAttributeExpression.test(attribute);
  let callback = observeValueAttribute;
  if (isBoolean || isClass || isStyle) {
    element.removeAttribute(attribute);
    callback = isBoolean ? observeBooleanAttribute : isClass ? observeClassAttribute : observeStyleAttribute;
  }
  const subscription2 = callback(element, attribute, expression);
  if (subscription2 !== undefined) {
    storeProperty(element, attribute, expression);
    storeSubscription(element, subscription2);
  }
}
var observeBooleanAttribute = function(element, name, expression) {
  return observe(expression.value, (value) => {
    const isBoolean = typeof value === "boolean";
    if (value === undefined || value === null || isBoolean) {
      element[name] = isBoolean ? value : false;
    }
  });
};
var observeClassAttribute = function(element, name, expression) {
  const classes = name.split(".").slice(1).map((name2) => name2.trim()).filter((name2) => name2.length > 0);
  if (classes.length === 0) {
    return;
  }
  return observe(expression.value, (value) => {
    if (value === true) {
      element.classList.add(...classes);
    } else {
      element.classList.remove(...classes);
    }
  });
};
var observeStyleAttribute = function(element, name, expression) {
  const [, first, second] = name.split(".");
  const property = first.trim();
  const suffix = second?.trim();
  if (property.length === 0 || suffix !== undefined && suffix.length === 0) {
    return;
  }
  return observe(expression.value, (value) => {
    if (value === undefined || value === null || value === false || value === true && suffix === undefined) {
      element.style.removeProperty(property);
    } else {
      element.style.setProperty(property, value === true ? suffix : `${value}${suffix ?? ""}`);
    }
  });
};
var observeValueAttribute = function(element, name, expression) {
  const isValueAttribute = valueAttributeExpression.test(name);
  return observe(expression.value, (value) => {
    if (isValueAttribute) {
      element.value = value;
    }
    if (value === undefined || value === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  });
};
var booleanAttributes = new Set([
  "checked",
  "disabled",
  "hidden",
  "inert",
  "multiple",
  "open",
  "readonly",
  "required",
  "selected"
]);
var classAttributeExpression = /^class\./i;
var styleAttributeExpression = /^style\./i;
var valueAttributeExpression = /^value$/i;

// src/helpers/dom/attribute.ts
function isBadAttribute(attribute2) {
  const { name, value } = attribute2;
  return onAttributeExpression.test(name) || sourceAttributeNameExpression.test(name) && sourceAttributeValueExpression.test(value);
}
function mapAttributes(element, expressions) {
  const attributes = Array.from(element.attributes);
  for (const attribute2 of attributes) {
    const { name, value } = attribute2;
    const expression = value === comment ? expressions.values[expressions.index++] : undefined;
    const badAttribute = isBadAttribute(attribute2);
    if (badAttribute || !(expression instanceof Expression) || !(element instanceof HTMLElement || element instanceof SVGElement)) {
      if (badAttribute) {
        element.removeAttribute(name);
      }
      continue;
    }
    if (name.startsWith("@")) {
      addEvent(element, attribute2.name, expression);
    } else {
      observeAttribute(element, attribute2.name, expression);
    }
  }
}
var onAttributeExpression = /^on/i;
var sourceAttributeNameExpression = /^(href|src|xlink:href)$/i;
var sourceAttributeValueExpression = /(data:text\/html|javascript:)/i;

// src/helpers/dom/node.ts
var cleanNode = function(node3, removeSubscriptions) {
  removeEvents(node3);
  removeNodeItems(node3);
  nodeProperties.delete(node3);
  if (removeSubscriptions) {
    const subscriptions = nodeSubscriptions.get(node3) ?? [];
    for (const subscription2 of subscriptions) {
      subscription2.unsubscribe();
    }
    nodeSubscriptions.delete(node3);
  }
  if (node3.hasChildNodes()) {
    cleanNodes(Array.from(node3.childNodes), removeSubscriptions);
  }
};
function cleanNodes(nodes, removeSubscriptions) {
  for (const node3 of nodes) {
    cleanNode(node3, removeSubscriptions);
  }
}
function createNode(value) {
  if (value instanceof Node) {
    return value;
  }
  return value instanceof Template ? value.render() : document.createTextNode(getString(value));
}
function createNodes(html) {
  const element = document.createElement("template");
  element.innerHTML = html;
  const fragment = element.content.cloneNode(true);
  const scripts = Array.from(fragment.querySelectorAll("script"));
  for (const script of scripts) {
    script.remove();
  }
  fragment.normalize();
  return fragment;
}
function mapNodes(data11, template6, node3) {
  const { expressions } = data11.get(template6);
  const children = Array.from(node3.childNodes);
  for (const child of children) {
    if (child.nodeType === 8 && child.nodeValue === blixt) {
      setNode(child, expressions.values[expressions.index++]);
      continue;
    }
    if (child instanceof Element) {
      mapAttributes(child, expressions);
    }
    if (child.hasChildNodes()) {
      mapNodes(data11, template6, child);
    }
  }
  return node3;
}
function replaceNodes(from, to, set) {
  const nodes = (from ?? []).flatMap((item) => item.nodes);
  cleanNodes(nodes, true);
  for (const node3 of nodes) {
    if (nodes.indexOf(node3) === 0) {
      node3.before(...to.flatMap((item) => item.nodes));
    }
    node3.remove();
  }
  return set ? to : undefined;
}
function setNode(comment2, value) {
  if (value instanceof Expression) {
    observeContent(comment2, value);
    return;
  }
  const node3 = createNode(value);
  comment2.replaceWith(...documentFragmentConstructor.test(node3.constructor.name) ? Array.from(node3.childNodes) : [node3]);
}

// src/template/hydration.ts
var compareNode = function(first, second, pairs) {
  first.normalize();
  second.normalize();
  const firstChildren = Array.from(first.childNodes).filter((child) => isValidNode(child));
  const secondChildren = Array.from(second.childNodes).filter((child) => isValidNode(child));
  const { length } = firstChildren;
  if (length !== secondChildren.length) {
    console.warn("Nodes do not have same number of children");
    return false;
  }
  if (length === 0) {
    const valid = first.isEqualNode(second);
    if (valid) {
      pairs.push({ first, second });
    } else {
      console.warn("Nodes are not equal");
    }
    return valid;
  }
  for (let index = 0;index < length; index += 1) {
    if (!compareNode(firstChildren[index], secondChildren[index], pairs)) {
      return false;
    }
  }
  pairs.push({ first, second });
  return true;
};
function hydrate(node4, template6, callback) {
  const rendered = render(template6);
  const pairs = [];
  if (normaliseContent(node4) !== normaliseContent(rendered) || !compareNode(node4, rendered, pairs)) {
    console.warn("Unable to hydrate existing content");
    return node4;
  }
  for (const pair of pairs) {
    hydrateContent(pair);
    hydrateProperties(pair);
    hydrateSubscriptions(pair);
  }
  cleanNodes([rendered], false);
  if (typeof callback === "function") {
    callback(node4);
  }
  return node4;
}
var hydrateContent = function(pair) {
  const item = [...nodeItems.values()].find((items) => items.some((item2) => item2.nodes.includes(pair.second)))?.find((item2) => item2.nodes.includes(pair.second));
  if (item === undefined) {
    return;
  }
  const index = item.nodes.indexOf(pair.second);
  if (index > -1) {
    item.nodes.splice(index, 1, pair.first);
  }
};
var hydrateProperties = function(pair) {
  const properties = nodeProperties.get(pair.second) ?? [];
  for (const [name, items] of properties) {
    for (const item of items) {
      if (item instanceof Expression) {
        observeAttribute(pair.first, name, item);
      } else {
        addEvent(pair.first, name, item.expression);
      }
    }
  }
};
var hydrateSubscriptions = function(pair) {
  const subscriptions = nodeSubscriptions.get(pair.second) ?? new Set;
  if (subscriptions.size > 0) {
    nodeSubscriptions.set(pair.first, subscriptions);
  }
  nodeSubscriptions.delete(pair.second);
};
var isValidNode = function(node4) {
  if (node4 instanceof Text) {
    return (node4?.textContent ?? "").trim().length > 0;
  }
  return node4 instanceof Element ? !/^script$/i.test(node4.tagName) : true;
};
var normaliseContent = function(node4) {
  return (node4?.textContent ?? "").replaceAll(/\s+/g, " ").trim();
};

// src/template/index.ts
function render(template6) {
  const asString = toString(template6);
  const nodes = createNodes(asString);
  return mapNodes(templateData, template6, nodes);
}
function template6(strings, ...expressions) {
  return new Template(strings, expressions);
}
function toString(template7) {
  const { strings, expressions } = templateData.get(template7);
  function express(value, expression) {
    const isFunction = typeof expression === "function";
    if (isFunction || expression instanceof Node || expression instanceof Template) {
      expressions.values.push(isFunction ? new Expression(expression) : expression);
      return value + comment;
    }
    if (Array.isArray(expression)) {
      let expressed = "";
      for (const exp of expression) {
        expressed += express("", exp);
      }
      return value + expressed;
    }
    return value + getString(expression);
  }
  let html = "";
  for (let index = 0;index < strings.length; index += 1) {
    const value = strings[index];
    const expression = expressions.original[index];
    html += expression === undefined ? value : express(value, expression);
  }
  return html;
}

class Expression {
  callback;
  get value() {
    return this.callback;
  }
  constructor(callback) {
    this.callback = callback;
  }
}

class Template {
  identifier;
  get id() {
    return this.identifier;
  }
  constructor(strings, expressions) {
    templateData.set(this, {
      strings,
      expressions: {
        index: 0,
        original: expressions ?? [],
        values: []
      }
    });
  }
  hydrate(node5, callback) {
    return hydrate(node5, this, callback);
  }
  identify(key) {
    if (this.identifier === undefined && isKey(key)) {
      this.identifier = key;
    }
    return this;
  }
  render(parent) {
    const rendered = render(this);
    parent?.append(rendered);
    return parent ?? rendered;
  }
}
export {
  template6 as template,
  subscribe,
  store,
  observe
};

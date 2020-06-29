import {hasOwnProperty, getTypeOf, isPlainObject, PlainObject} from 'core-helpers';
import omit from 'lodash/omit';
import cloneDeep from 'lodash/cloneDeep';

import type {Attribute} from './attribute';
import {isComponentClassOrInstance} from '../utilities';

export type AttributeSelector = boolean | PlainObject;

export function createAttributeSelectorFromNames(names: string[]) {
  const attributeSelector: AttributeSelector = {};

  for (const name of names) {
    attributeSelector[name] = true;
  }

  return attributeSelector;
}

export function createAttributeSelectorFromAttributes(attributes: Iterable<Attribute>) {
  const attributeSelector: AttributeSelector = {};

  for (const attribute of attributes) {
    attributeSelector[attribute.getName()] = true;
  }

  return attributeSelector;
}

export function getFromAttributeSelector(
  attributeSelector: AttributeSelector,
  name: string
): AttributeSelector {
  attributeSelector = normalizeAttributeSelector(attributeSelector);

  if (typeof attributeSelector === 'boolean') {
    return attributeSelector;
  }

  return normalizeAttributeSelector(attributeSelector[name]);
}

export function setWithinAttributeSelector(
  attributeSelector: AttributeSelector,
  name: string,
  subattributeSelector: AttributeSelector
): AttributeSelector {
  attributeSelector = normalizeAttributeSelector(attributeSelector);

  if (typeof attributeSelector === 'boolean') {
    return attributeSelector;
  }

  subattributeSelector = normalizeAttributeSelector(subattributeSelector);

  if (subattributeSelector === false) {
    return omit(attributeSelector, name);
  }

  return {...attributeSelector, [name]: subattributeSelector};
}

export function cloneAttributeSelector(attributeSelector: AttributeSelector) {
  return cloneDeep(attributeSelector);
}

export function attributeSelectorsAreEqual(
  attributeSelector: AttributeSelector,
  otherAttributeSelector: AttributeSelector
) {
  return (
    attributeSelector === otherAttributeSelector ||
    (attributeSelectorIncludes(attributeSelector, otherAttributeSelector) &&
      attributeSelectorIncludes(otherAttributeSelector, attributeSelector))
  );
}

export function attributeSelectorIncludes(
  attributeSelector: AttributeSelector,
  otherAttributeSelector: AttributeSelector
) {
  attributeSelector = normalizeAttributeSelector(attributeSelector);
  otherAttributeSelector = normalizeAttributeSelector(otherAttributeSelector);

  if (attributeSelector === otherAttributeSelector) {
    return true;
  }

  if (typeof attributeSelector === 'boolean') {
    return attributeSelector;
  }

  if (typeof otherAttributeSelector === 'boolean') {
    return !otherAttributeSelector;
  }

  for (const [name, otherSubattributeSelector] of Object.entries(otherAttributeSelector)) {
    const subattributeSelector = attributeSelector[name];

    if (!attributeSelectorIncludes(subattributeSelector, otherSubattributeSelector)) {
      return false;
    }
  }

  return true;
}

export function mergeAttributeSelectors(
  attributeSelector: AttributeSelector,
  otherAttributeSelector: AttributeSelector
): AttributeSelector {
  attributeSelector = normalizeAttributeSelector(attributeSelector);
  otherAttributeSelector = normalizeAttributeSelector(otherAttributeSelector);

  if (attributeSelector === true) {
    return true;
  }

  if (attributeSelector === false) {
    return otherAttributeSelector;
  }

  if (otherAttributeSelector === true) {
    return true;
  }

  if (otherAttributeSelector === false) {
    return attributeSelector;
  }

  for (const [name, otherSubattributeSelector] of Object.entries(otherAttributeSelector)) {
    const subattributeSelector = (attributeSelector as PlainObject)[name];

    attributeSelector = setWithinAttributeSelector(
      attributeSelector,
      name,
      mergeAttributeSelectors(subattributeSelector, otherSubattributeSelector)
    );
  }

  return attributeSelector;
}

export function removeFromAttributeSelector(
  attributeSelector: AttributeSelector,
  otherAttributeSelector: AttributeSelector
): AttributeSelector {
  attributeSelector = normalizeAttributeSelector(attributeSelector);
  otherAttributeSelector = normalizeAttributeSelector(otherAttributeSelector);

  if (otherAttributeSelector === true) {
    return false;
  }

  if (otherAttributeSelector === false) {
    return attributeSelector;
  }

  if (attributeSelector === true) {
    throw new Error(
      "Cannot remove an 'object' attribute selector from a 'true' attribute selector"
    );
  }

  if (attributeSelector === false) {
    return false;
  }

  for (const [name, otherSubattributeSelector] of Object.entries(otherAttributeSelector)) {
    const subattributeSelector = (attributeSelector as PlainObject)[name];

    attributeSelector = setWithinAttributeSelector(
      attributeSelector,
      name,
      removeFromAttributeSelector(subattributeSelector, otherSubattributeSelector)
    );
  }

  return attributeSelector;
}

export function iterateOverAttributeSelector(attributeSelector: AttributeSelector) {
  return {
    *[Symbol.iterator]() {
      for (const [name, subattributeSelector] of Object.entries(attributeSelector)) {
        const normalizedSubattributeSelector = normalizeAttributeSelector(subattributeSelector);

        if (normalizedSubattributeSelector !== false) {
          yield [name, normalizedSubattributeSelector] as [string, AttributeSelector];
        }
      }
    }
  };
}

type PickFromAttributeSelectorResult<Value> = Value extends Array<infer Element>
  ? Array<PickFromAttributeSelectorResult<Element>>
  : Value extends object
  ? object
  : Value;

export function pickFromAttributeSelector<Value>(
  value: Value,
  attributeSelector: AttributeSelector,
  options?: {includeAttributeNames?: string[]}
): PickFromAttributeSelectorResult<Value>;
export function pickFromAttributeSelector(
  value: unknown,
  attributeSelector: AttributeSelector,
  options: {includeAttributeNames?: string[]} = {}
) {
  attributeSelector = normalizeAttributeSelector(attributeSelector);

  if (attributeSelector === false) {
    throw new Error(
      `Cannot pick attributes from a value when the specified attribute selector is 'false'`
    );
  }

  const {includeAttributeNames = []} = options;

  return _pick(value, attributeSelector, {includeAttributeNames});
}

function _pick(
  value: unknown,
  attributeSelector: AttributeSelector,
  {includeAttributeNames}: {includeAttributeNames: string[]}
): unknown {
  if (attributeSelector === true) {
    return value;
  }

  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const array = value;

    return array.map((value) => _pick(value, attributeSelector, {includeAttributeNames}));
  }

  const isComponent = isComponentClassOrInstance(value);

  if (!(isComponent || isPlainObject(value))) {
    throw new Error(
      `Cannot pick attributes from a value that is not a component, a plain object, or an array (value type: '${getTypeOf(
        value
      )}')`
    );
  }

  const componentOrObject = value as PlainObject;

  const result: PlainObject = {};

  if (!isComponent) {
    for (const name of includeAttributeNames) {
      if (hasOwnProperty(componentOrObject, name)) {
        result[name] = componentOrObject[name];
      }
    }
  }

  for (const [name, subattributeSelector] of iterateOverAttributeSelector(attributeSelector)) {
    const value = isComponent
      ? componentOrObject.getAttribute(name).getValue()
      : componentOrObject[name];

    result[name] = _pick(value, subattributeSelector, {includeAttributeNames});
  }

  return result;
}

type TraverseIteratee = (
  value: any,
  attributeSelector: AttributeSelector,
  context: TraverseContext
) => void;

type TraverseContext = {name?: string; object?: object; isArray?: boolean};

type TraverseOptions = {includeSubtrees?: boolean; includeLeafs?: boolean};

export function traverseAttributeSelector(
  value: any,
  attributeSelector: AttributeSelector,
  iteratee: TraverseIteratee,
  options: TraverseOptions = {}
) {
  attributeSelector = normalizeAttributeSelector(attributeSelector);

  const {includeSubtrees = false, includeLeafs = true} = options;

  if (attributeSelector === false) {
    return;
  }

  _traverse(value, attributeSelector, iteratee, {
    includeSubtrees,
    includeLeafs,
    _context: {},
    _isDeep: false
  });
}

function _traverse(
  value: any,
  attributeSelector: AttributeSelector,
  iteratee: TraverseIteratee,
  {
    includeSubtrees,
    includeLeafs,
    _context,
    _isDeep
  }: TraverseOptions & {_context: TraverseContext; _isDeep: boolean}
) {
  if (attributeSelector === true || value === undefined) {
    if (includeLeafs) {
      iteratee(value, attributeSelector, _context);
    }

    return;
  }

  if (Array.isArray(value)) {
    const array = value;

    for (const value of array) {
      _traverse(value, attributeSelector, iteratee, {
        includeSubtrees,
        includeLeafs,
        _context: {..._context, isArray: true},
        _isDeep
      });
    }

    return;
  }

  const isComponent = isComponentClassOrInstance(value);

  if (!(isComponent || isPlainObject(value))) {
    throw new Error(
      `Cannot traverse attributes from a value that is not a component, a plain object, or an array (value type: '${getTypeOf(
        value
      )}')`
    );
  }

  const componentOrObject = value;

  if (_isDeep && includeSubtrees) {
    iteratee(componentOrObject, attributeSelector, _context);
  }

  for (const [name, subattributeSelector] of iterateOverAttributeSelector(attributeSelector)) {
    if (isComponent && !componentOrObject.getAttribute(name).isSet()) {
      continue;
    }

    const value = componentOrObject[name];

    _traverse(value, subattributeSelector, iteratee, {
      includeSubtrees,
      includeLeafs,
      _context: {name, object: componentOrObject},
      _isDeep: true
    });
  }
}

export function normalizeAttributeSelector(attributeSelector: any): AttributeSelector {
  if (attributeSelector === undefined) {
    return false;
  }

  if (typeof attributeSelector === 'boolean') {
    return attributeSelector;
  }

  if (isPlainObject(attributeSelector)) {
    return attributeSelector;
  }

  throw new Error(
    `Expected a valid attribute selector, but received a value of type '${getTypeOf(
      attributeSelector
    )}'`
  );
}

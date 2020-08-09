import {
  hasOwnProperty,
  getTypeOf,
  isPlainObject,
  PlainObject,
  assertIsFunction
} from 'core-helpers';
import omit from 'lodash/omit';
import cloneDeep from 'lodash/cloneDeep';
import isEmpty from 'lodash/isEmpty';

import type {Attribute} from './attribute';
import {isComponentClassOrInstance} from '../utilities';

export type AttributeSelector = boolean | PlainObject;

/**
 * @typedef AttributeSelector
 *
 * An `AttributeSelector` allows you to select some attributes of a component.
 *
 * The simplest `AttributeSelector` is `true`, which means that all the attributes are selected.

 * Another possible `AttributeSelector` is `false`, which means that no attributes are selected.
 *
 * To select some specific attributes, you can use a plain object where:
 *
 * * The keys are the name of the attributes you want to select.
 * * The values are a boolean or a nested object to select some attributes of a nested component.
 *
 * **Examples:**
 *
 * ```
 * // Selects all the attributes
 * true
 *
 * // Excludes all the attributes
 * false
 *
 * // Selects `title`
 * {title: true}
 *
 * // Selects also `title` (`summary` is not selected)
 * {title: true, summary: false}
 *
 * // Selects `title` and `summary`
 * {title: true, summary: true}
 *
 * // Selects `title`, `movieDetails.duration`, and `movieDetails.aspectRatio`
 * {
 *   title: true,
 *   movieDetails: {
 *     duration: true,
 *     aspectRatio: true
 *   }
 * }
 * ```
 */

/**
 * Creates an `AttributeSelector` from the specified names.
 *
 * @param names An array of strings.
 *
 * @returns An `AttributeSelector`.
 *
 * @example
 * ```
 * createAttributeSelectorFromNames(['title', 'summary']);
 * // => {title: true, summary: true}
 * ```
 *
 * @category Functions
 */
export function createAttributeSelectorFromNames(names: string[]) {
  const attributeSelector: AttributeSelector = {};

  for (const name of names) {
    attributeSelector[name] = true;
  }

  return attributeSelector;
}

/**
 * Creates an `AttributeSelector` from an attribute iterator.
 *
 * @param attributes An [`Attribute`](https://liaison.dev/docs/v1/reference/attribute) iterator.
 *
 * @returns An `AttributeSelector`.
 *
 * @example
 * ```
 * createAttributeSelectorFromAttributes(Movie.prototype.getAttributes());
 * // => {title: true, summary: true, movieDetails: true}
 * ```
 *
 * @category Functions
 */
export function createAttributeSelectorFromAttributes(attributes: Iterable<Attribute>) {
  const attributeSelector: AttributeSelector = {};

  for (const attribute of attributes) {
    attributeSelector[attribute.getName()] = true;
  }

  return attributeSelector;
}

/**
 * Gets an entry of an `AttributeSelector`.
 *
 * @param attributeSelector An `AttributeSelector`.
 * @param name The name of the entry to get.
 *
 * @returns An `AttributeSelector`.
 *
 * @example
 * ```
 * getFromAttributeSelector(true, 'title');
 * // => true
 *
 * getFromAttributeSelector(false, 'title');
 * // => false
 *
 * getFromAttributeSelector({title: true}, 'title');
 * // => true
 *
 * getFromAttributeSelector({title: true}, 'summary');
 * // => false
 *
 * getFromAttributeSelector({movieDetails: {duration: true}}, 'movieDetails');
 * // => {duration: true}
 * ```
 *
 * @category Functions
 */
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

/**
 * Returns an `AttributeSelector` where an entry of the specified `AttributeSelector` is set with another `AttributeSelector`.
 *
 * @param attributeSelector An `AttributeSelector`.
 * @param name The name of the entry to set.
 * @param subattributeSelector Another `AttributeSelector`.
 *
 * @returns A new `AttributeSelector`.
 *
 * @example
 * ```
 * setWithinAttributeSelector({title: true}, 'summary', true);
 * // => {title: true, summary: true}
 *
 * setWithinAttributeSelector({title: true}, 'summary', false);
 * // => {title: true}
 *
 * setWithinAttributeSelector({title: true, summary: true}, 'summary', false);
 * // => {title: true}
 *
 * setWithinAttributeSelector({title: true}, 'movieDetails', {duration: true});
 * // => {title: true, movieDetails: {duration: true}}
 * ```
 *
 * @category Functions
 */
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

/**
 * Clones an `AttributeSelector`.
 *
 * @param attributeSelector An `AttributeSelector`.
 *
 * @returns A new `AttributeSelector`.
 *
 * @example
 * ```
 * cloneAttributeSelector(true);
 * // => true
 *
 * cloneAttributeSelector(false);
 * // => false
 *
 * cloneAttributeSelector({title: true, movieDetails: {duration: true});
 * // => {title: true, movieDetails: {duration: true}
 * ```
 *
 * @category Functions
 */
export function cloneAttributeSelector(attributeSelector: AttributeSelector) {
  return cloneDeep(attributeSelector);
}

/**
 * Returns whether an `AttributeSelector` is equal to another `AttributeSelector`.
 *
 * @param attributeSelector An `AttributeSelector`.
 * @param otherAttributeSelector Another `AttributeSelector`.
 *
 * @returns A boolean.
 *
 * @example
 * ```
 * attributeSelectorsAreEqual({title: true}, {title: true});
 * // => true
 *
 * attributeSelectorsAreEqual({title: true, summary: false}, {title: true});
 * // => true
 *
 * attributeSelectorsAreEqual({title: true}, {summary: true});
 * // => false
 * ```
 *
 * @category Functions
 */
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

/**
 * Returns whether an `AttributeSelector` includes another `AttributeSelector`.
 *
 * @param attributeSelector An `AttributeSelector`.
 * @param otherAttributeSelector Another `AttributeSelector`.
 *
 * @returns A boolean.
 *
 * @example
 * ```
 * attributeSelectorIncludes({title: true}, {title: true});
 * // => true
 *
 * attributeSelectorIncludes({title: true, summary: true}, {title: true});
 * // => true
 *
 * attributeSelectorIncludes({title: true}, {summary: true});
 * // => false
 * ```
 *
 * @category Functions
 */
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

/**
 * Returns an `AttributeSelector` which is the result of merging an `AttributeSelector` with another `AttributeSelector`.
 *
 * @param attributeSelector An `AttributeSelector`.
 * @param otherAttributeSelector Another `AttributeSelector`.
 *
 * @returns A new `AttributeSelector`.
 *
 * @example
 * ```
 * mergeAttributeSelectors({title: true}, {title: true});
 * // => {title: true}
 *
 * mergeAttributeSelectors({title: true}, {summary: true});
 * // => {title: true, summary: true}
 *
 * mergeAttributeSelectors({title: true, summary: true}, {summary: false});
 * // => {title: true}
 * ```
 *
 * @category Functions
 */
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

/**
 * Returns an `AttributeSelector` which is the result of the intersection of an `AttributeSelector` with another `AttributeSelector`.
 *
 * @param attributeSelector An `AttributeSelector`.
 * @param otherAttributeSelector Another `AttributeSelector`.
 *
 * @returns A new `AttributeSelector`.
 *
 * @example
 * ```
 * intersectAttributeSelectors({title: true, summary: true}, {title: true});
 * // => {title: true}
 *
 * intersectAttributeSelectors({title: true}, {summary: true});
 * // => {}
 * ```
 *
 * @category Functions
 */
export function intersectAttributeSelectors(
  attributeSelector: AttributeSelector,
  otherAttributeSelector: AttributeSelector
): AttributeSelector {
  attributeSelector = normalizeAttributeSelector(attributeSelector);
  otherAttributeSelector = normalizeAttributeSelector(otherAttributeSelector);

  if (attributeSelector === false || otherAttributeSelector === false) {
    return false;
  }

  if (attributeSelector === true) {
    return otherAttributeSelector;
  }

  if (otherAttributeSelector === true) {
    return attributeSelector;
  }

  let intersectedAttributeSelector = {};

  for (const [name, otherSubattributeSelector] of Object.entries(otherAttributeSelector)) {
    const subattributeSelector = (attributeSelector as PlainObject)[name];

    intersectedAttributeSelector = setWithinAttributeSelector(
      intersectedAttributeSelector,
      name,
      intersectAttributeSelectors(subattributeSelector, otherSubattributeSelector)
    );
  }

  return intersectedAttributeSelector;
}

/**
 * Returns an `AttributeSelector` which is the result of removing an `AttributeSelector` from another `AttributeSelector`.
 *
 * @param attributeSelector An `AttributeSelector`.
 * @param otherAttributeSelector Another `AttributeSelector`.
 *
 * @returns A new `AttributeSelector`.
 *
 * @example
 * ```
 * removeFromAttributeSelector({title: true, summary: true}, {summary: true});
 * // => {title: true}
 *
 * removeFromAttributeSelector({title: true}, {title: true});
 * // => {}
 * ```
 *
 * @category Functions
 */
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

  assertIsFunction(iteratee);

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

export function trimAttributeSelector(attributeSelector: AttributeSelector): AttributeSelector {
  attributeSelector = normalizeAttributeSelector(attributeSelector);

  if (typeof attributeSelector === 'boolean') {
    return attributeSelector;
  }

  for (const [name, subattributeSelector] of Object.entries(attributeSelector)) {
    attributeSelector = setWithinAttributeSelector(
      attributeSelector,
      name,
      trimAttributeSelector(subattributeSelector)
    );
  }

  if (isEmpty(attributeSelector)) {
    return false;
  }

  return attributeSelector;
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

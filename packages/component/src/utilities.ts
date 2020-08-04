import {isES2015Class, getFunctionName, getTypeOf} from 'core-helpers';
import compact from 'lodash/compact';

import type {Component, ComponentMixin} from './component';

/**
 * Returns whether the specified value is a component class.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isComponentClass(value: any): value is typeof Component {
  return typeof value?.isComponent === 'function';
}

/**
 * Returns whether the specified value is a component instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isComponentInstance(value: any): value is Component {
  return typeof value?.constructor?.isComponent === 'function';
}

/**
 * Returns whether the specified value is a component class or instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isComponentClassOrInstance(value: any): value is typeof Component | Component {
  return (
    typeof value?.isComponent === 'function' ||
    typeof value?.constructor?.isComponent === 'function'
  );
}

/**
 * Throws an error if the specified value is not a component class.
 *
 * @param value A value of any type.
 *
 * @category Utilities
 */
export function assertIsComponentClass(value: any): asserts value is typeof Component {
  if (!isComponentClass(value)) {
    throw new Error(
      `Expected a component class, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

/**
 * Throws an error if the specified value is not a component instance.
 *
 * @param value A value of any type.
 *
 * @category Utilities
 */
export function assertIsComponentInstance(value: any): asserts value is Component {
  if (!isComponentInstance(value)) {
    throw new Error(
      `Expected a component instance, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

/**
 * Throws an error if the specified value is not a component class or instance.
 *
 * @param value A value of any type.
 *
 * @category Utilities
 */
export function assertIsComponentClassOrInstance(
  value: any
): asserts value is typeof Component | Component {
  if (!isComponentClassOrInstance(value)) {
    throw new Error(
      `Expected a component class or instance, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

/**
 * Ensures that the specified component is a class. If you specify a component instance (or prototype), the class of the component is returned. If you specify a component class, it is returned as is.
 *
 * @param component A component class or instance.
 *
 * @returns A component class.
 *
 * @example
 * ```
 * ensureComponentClass(movie) => Movie
 * ensureComponentClass(Movie.prototype) => Movie
 * ensureComponentClass(Movie) => Movie
 * ```
 *
 * @category Utilities
 */
export function ensureComponentClass(component: any) {
  if (isComponentClass(component)) {
    return component;
  }

  if (isComponentInstance(component)) {
    return component.constructor as typeof Component;
  }

  throw new Error(
    `Expected a component class or instance, but received a value of type '${getTypeOf(component)}'`
  );
}

/**
 * Ensures that the specified component is an instance (or prototype). If you specify a component class, the component prototype is returned. If you specify a component instance (or prototype), it is returned as is.
 *
 * @param component A component class or instance.
 *
 * @returns A component instance (or prototype).
 *
 * @example
 * ```
 * ensureComponentInstance(Movie) => Movie.prototype
 * ensureComponentClass(Movie.prototype) => Movie.prototype
 * ensureComponentClass(movie) => movie
 * ```
 *
 * @category Utilities
 */
export function ensureComponentInstance(component: any) {
  if (isComponentClass(component)) {
    return component.prototype;
  }

  if (isComponentInstance(component)) {
    return component;
  }

  throw new Error(
    `Expected a component class or instance, but received a value of type '${getTypeOf(component)}'`
  );
}

const COMPONENT_NAME_PATTERN = /^[A-Z][A-Za-z0-9_]*$/;

/**
 * Returns whether the specified string is a valid component name. The rule is the same as for typical JavaScript class names.
 *
 * @param name The string to check.
 *
 * @returns A boolean.
 *
 * @example
 * ```
 * isComponentName('Movie') => true
 * isComponentName('Movie123') => true
 * isComponentName('Awesome_Movie') => true
 * isComponentName('123Movie') => false
 * isComponentName('Awesome-Movie') => false
 * isComponentName('movie') => false
 * ```
 *
 * @category Utilities
 */
export function isComponentName(name: string) {
  return COMPONENT_NAME_PATTERN.test(name);
}

/**
 * Throws an error if the specified string is not a valid component name.
 *
 * @param name The string to check.
 *
 * @category Utilities
 */
export function assertIsComponentName(name: string) {
  if (name === '') {
    throw new Error('A component name cannot be empty');
  }

  if (!isComponentName(name)) {
    throw new Error(`The specified component name ('${name}') is invalid`);
  }
}

/**
 * Transforms a component class type into a component name.
 *
 * @param name A string representing a component class type.
 *
 * @returns A component name.
 *
 * @example
 * ```
 * getComponentNameFromComponentClassType('typeof Movie') => 'Movie'
 * ```
 *
 * @category Utilities
 */
export function getComponentNameFromComponentClassType(type: string) {
  assertIsComponentType(type, {allowInstances: false});

  return type.slice('typeof '.length);
}

/**
 * Transforms a component instance type into a component name.
 *
 * @param name A string representing a component instance type.
 *
 * @returns A component name.
 *
 * @example
 * ```
 * getComponentNameFromComponentInstanceType('Movie') => 'Movie'
 * ```
 *
 * @category Utilities
 */
export function getComponentNameFromComponentInstanceType(type: string) {
  assertIsComponentType(type, {allowClasses: false});

  return type;
}

const COMPONENT_CLASS_TYPE_PATTERN = /^typeof [A-Z][A-Za-z0-9_]*$/;
const COMPONENT_INSTANCE_TYPE_PATTERN = /^[A-Z][A-Za-z0-9_]*$/;

/**
 * Returns whether the specified string is a valid component type.
 *
 * @param name The string to check.
 * @param [options.allowClasses] A boolean specifying whether component class types are allowed (default: `true`).
 * @param [options.allowInstances] A boolean specifying whether component instance types are allowed (default: `true`).
 *
 * @returns A boolean.
 *
 * @example
 * ```
 * isComponentType('typeof Movie') => true
 * isComponentType('Movie') => true
 * isComponentType('typeof Awesome-Movie') => false
 * isComponentType('movie') => false
 * isComponentType('typeof Movie', {allowClasses: false}) => false
 * isComponentType('Movie', {allowInstances: false}) => false
 * ```
 *
 * @category Utilities
 */
export function isComponentType(type: string, {allowClasses = true, allowInstances = true} = {}) {
  if (allowClasses && COMPONENT_CLASS_TYPE_PATTERN.test(type)) {
    return 'componentClassType';
  }

  if (allowInstances && COMPONENT_INSTANCE_TYPE_PATTERN.test(type)) {
    return 'componentInstanceType';
  }

  return false;
}

/**
 * Throws an error if the specified string is not a valid component type.
 *
 * @param name The string to check.
 * @param [options.allowClasses] A boolean specifying whether component class types are allowed (default: `true`).
 * @param [options.allowInstances] A boolean specifying whether component instance types are allowed (default: `true`).
 *
 * @category Utilities
 */
export function assertIsComponentType(
  type: string,
  {allowClasses = true, allowInstances = true} = {}
) {
  if (type === '') {
    throw new Error('A component type cannot be empty');
  }

  const isComponentTypeResult = isComponentType(type, {allowClasses, allowInstances});

  if (isComponentTypeResult === false) {
    throw new Error(`The specified component type ('${type}') is invalid`);
  }

  return isComponentTypeResult;
}

/**
 * Transforms a component name into a component class type.
 *
 * @param name A component name.
 *
 * @returns A component class type.
 *
 * @example
 * ```
 * getComponentClassTypeFromComponentName('Movie') => 'typeof Movie'
 * ```
 *
 * @category Utilities
 */
export function getComponentClassTypeFromComponentName(name: string) {
  assertIsComponentName(name);

  return `typeof ${name}`;
}

/**
 * Transforms a component name into a component instance type.
 *
 * @param name A component name.
 *
 * @returns A component instance type.
 *
 * @example
 * ```
 * getComponentInstanceTypeFromComponentName('Movie') => 'Movie'
 * ```
 *
 * @category Utilities
 */
export function getComponentInstanceTypeFromComponentName(name: string) {
  assertIsComponentName(name);

  return name;
}

type ComponentMap = {[name: string]: typeof Component};

export function createComponentMap(components: typeof Component[] = []) {
  const componentMap: ComponentMap = Object.create(null);

  for (const component of components) {
    assertIsComponentClass(component);

    componentMap[component.getComponentName()] = component;
  }

  return componentMap;
}

export function getComponentFromComponentMap(componentMap: ComponentMap, name: string) {
  assertIsComponentName(name);

  const component = componentMap[name];

  if (component === undefined) {
    throw new Error(`The component '${name}' is unknown`);
  }

  return component;
}

export function isComponentMixin(value: any): value is ComponentMixin {
  return typeof value === 'function' && getFunctionName(value) !== '' && !isES2015Class(value);
}

export function assertIsComponentMixin(value: any): asserts value is ComponentMixin {
  if (!isComponentMixin(value)) {
    throw new Error(
      `Expected a component mixin, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

export function composeDescription(description: string[]) {
  let composedDescription = compact(description).join(', ');

  if (composedDescription !== '') {
    composedDescription = ` (${composedDescription})`;
  }

  return composedDescription;
}

export function joinAttributePath(path: [string?, string?]) {
  const compactedPath = compact(path);

  if (compactedPath.length === 0) {
    return '';
  }

  if (compactedPath.length === 1) {
    return compactedPath[0];
  }

  const [first, second] = compactedPath;

  if (second.startsWith('[')) {
    return `${first}${second}`;
  }

  return `${first}.${second}`;
}

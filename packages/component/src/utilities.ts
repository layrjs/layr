import {getTypeOf} from 'core-helpers';
import compact from 'lodash/compact';

import type {Component} from './component';

export function isComponentClass(value: any): value is typeof Component {
  return typeof value?.isComponent === 'function';
}

export function isComponentInstance(value: any): value is Component {
  return typeof value?.constructor?.isComponent === 'function';
}

export function isComponentClassOrInstance(value: any): value is typeof Component | Component {
  return (
    typeof value?.isComponent === 'function' ||
    typeof value?.constructor?.isComponent === 'function'
  );
}

export function assertIsComponentClass(value: any): asserts value is typeof Component {
  if (!isComponentClass(value)) {
    throw new Error(
      `Expected a component class, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

export function assertIsComponentInstance(value: any): asserts value is Component {
  if (!isComponentInstance(value)) {
    throw new Error(
      `Expected a component instance, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

export function assertIsComponentClassOrInstance(
  value: any
): asserts value is typeof Component | Component {
  if (!isComponentClassOrInstance(value)) {
    throw new Error(
      `Expected a component class or instance, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

export function ensureComponentClass(component: typeof Component | Component) {
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

export function ensureComponentInstance(component: typeof Component | Component) {
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

export function isComponentName(name: string) {
  return COMPONENT_NAME_PATTERN.test(name);
}

export function assertIsComponentName(name: string) {
  if (name === '') {
    throw new Error('A component name cannot be empty');
  }

  if (!isComponentName(name)) {
    throw new Error(`The specified component name ('${name}') is invalid`);
  }
}

export function getComponentNameFromComponentClassType(type: string) {
  assertIsComponentType(type, {allowInstances: false});

  return type.slice('typeof '.length);
}

export function getComponentNameFromComponentInstanceType(type: string) {
  assertIsComponentType(type, {allowClasses: false});

  return type;
}

const COMPONENT_CLASS_TYPE_PATTERN = /^typeof [A-Z][A-Za-z0-9_]*$/;
const COMPONENT_INSTANCE_TYPE_PATTERN = /^[A-Z][A-Za-z0-9_]*$/;

export function isComponentType(type: string, {allowClasses = true, allowInstances = true} = {}) {
  if (allowClasses && COMPONENT_CLASS_TYPE_PATTERN.test(type)) {
    return 'componentClassType';
  }

  if (allowInstances && COMPONENT_INSTANCE_TYPE_PATTERN.test(type)) {
    return 'componentInstanceType';
  }

  return false;
}

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

export function getComponentClassTypeFromComponentName(name: string) {
  assertIsComponentName(name);

  return `typeof ${name}`;
}

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

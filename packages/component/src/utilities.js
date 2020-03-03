import {getTypeOf as coreGetTypeOf} from 'core-helpers';
import lowerFirst from 'lodash/lowerFirst';
import upperFirst from 'lodash/upperFirst';
import ow from 'ow';

export function isComponentClass(object) {
  return typeof object?.isComponent === 'function';
}

export function isComponent(object) {
  return isComponentClass(object?.constructor) === true;
}

export function getComponentName(object) {
  if (isComponentClass(object)) {
    // The object is a component class
    return object.getName();
  }

  if (isComponent(object)) {
    // The object is a component instance
    return lowerFirst(object.constructor.getName());
  }

  throw new Error('The specified object is not a component');
}

const COMPONENT_CLASS_NAME_PATTERN = /^[A-Z][A-Za-z0-9_]*$/;
const COMPONENT_INSTANCE_NAME_PATTERN = /^[a-z][A-Za-z0-9_]*$/;

export function isComponentName(name, options = {}) {
  ow(name, 'name', ow.string);
  ow(
    options,
    'options',
    ow.object.exactShape({allowClasses: ow.optional.boolean, allowInstances: ow.optional.boolean})
  );

  const {allowClasses = true, allowInstances = true} = options;

  if (allowClasses && COMPONENT_CLASS_NAME_PATTERN.test(name)) {
    return 'componentClassName';
  }

  if (allowInstances && COMPONENT_INSTANCE_NAME_PATTERN.test(name)) {
    return 'componentInstanceName';
  }

  return false;
}

export function validateComponentName(name, options = {}) {
  ow(name, 'name', ow.string);
  ow(
    options,
    'options',
    ow.object.exactShape({allowClasses: ow.optional.boolean, allowInstances: ow.optional.boolean})
  );

  const {allowClasses = true, allowInstances = true} = options;

  if (name === '') {
    throw new Error('A component name cannot be empty');
  }

  const isComponentNameResult = isComponentName(name, {allowClasses, allowInstances});

  if (!isComponentNameResult) {
    throw new Error(`The specified component name ('${name}') is invalid`);
  }

  return isComponentNameResult;
}

export function getComponentClassNameFromComponentInstanceName(name) {
  ow(name, 'name', ow.string);

  return upperFirst(name);
}

export function createComponentMap(components = []) {
  const componentMap = Object.create(null);

  for (const component of components) {
    if (!isComponentClass(component)) {
      throw new TypeError(
        `Expected 'components' items to be components but received type '${getTypeOf(component, {
          humanize: true
        })}'`
      );
    }

    componentMap[component.getName()] = component;
  }

  return componentMap;
}

export function getComponentFromComponentMap(componentMap, name) {
  const Component = componentMap[name];

  if (Component === undefined) {
    throw new Error(`The '${name}' component is unknown`);
  }

  return Component;
}

export function getTypeOf(value, options) {
  if (isComponentClass(value) || isComponent(value)) {
    return getComponentName(value);
  }

  return coreGetTypeOf(value, options);
}

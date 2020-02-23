import lowerFirst from 'lodash/lowerFirst';
import upperFirst from 'lodash/upperFirst';
import ow from 'ow';

export function isComponent(object) {
  return typeof object?.constructor?.isComponent === 'function';
}

export function getComponentName(object) {
  if (isComponent(object.prototype)) {
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
    return true;
  }

  if (allowInstances && COMPONENT_INSTANCE_NAME_PATTERN.test(name)) {
    return true;
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

  if (!isComponentName(name, {allowClasses, allowInstances})) {
    throw new Error(`The specified component name ('${name}') is invalid`);
  }
}

export function getComponentClassNameFromComponentInstanceName(name) {
  ow(name, 'name', ow.string);

  return upperFirst(name);
}

export function createComponentMap(components = []) {
  const componentMap = Object.create(null);

  for (const knownComponent of components) {
    if (!isComponent(knownComponent?.prototype)) {
      throw new TypeError(
        `Expected \`components\` items to be components but received type \`${typeof knownComponent}\``
      );
    }

    componentMap[knownComponent.getName()] = knownComponent;
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

import {getTypeOf as coreGetTypeOf} from 'core-helpers';
import upperFirst from 'lodash/upperFirst';
import lowerFirst from 'lodash/lowerFirst';
import compact from 'lodash/compact';
import ow from 'ow';

export function isComponentClass(object) {
  return typeof object?.isComponent === 'function';
}

export function isComponentInstance(object) {
  return isComponentClass(object?.constructor);
}

export function isComponent(object) {
  return isComponentInstance(object);
}

export function isComponentClassOrInstance(object) {
  return isComponentClass(object) || isComponentInstance(object);
}

export function validateIsComponentClass(object) {
  if (!isComponentClass(object)) {
    throw new Error(
      `Expected a component class, but received a value of type '${getHumanTypeOf(object)}'`
    );
  }
}

export function validateIsComponentInstance(object) {
  if (!isComponentInstance(object)) {
    throw new Error(
      `Expected a component instance, but received a value of type '${getHumanTypeOf(object)}'`
    );
  }
}

export function validateIsComponentClassOrInstance(object) {
  if (!isComponentClassOrInstance(object)) {
    throw new Error(
      `Expected a component class or instance, but received a value of type '${getHumanTypeOf(
        object
      )}'`
    );
  }
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

export function getComponentClassNameFromComponentName(name) {
  ow(name, 'name', ow.string);

  const validateComponentNameResult = validateComponentName(name);

  if (validateComponentNameResult === 'componentClassName') {
    return name;
  }

  return getComponentClassNameFromComponentInstanceName(name);
}

export function getComponentClassNameFromComponentInstanceName(name) {
  ow(name, 'name', ow.string);

  return upperFirst(name);
}

export function getComponentInstanceNameFromComponentClassName(name) {
  ow(name, 'name', ow.string);

  return lowerFirst(name);
}

export function createComponentMap(components = []) {
  const componentMap = Object.create(null);

  for (const component of components) {
    validateIsComponentClassOrInstance(component);

    componentMap[component.getComponentName()] = component;
  }

  return componentMap;
}

export function getComponentFromComponentMap(componentMap, name) {
  const component = componentMap[name];

  if (component === undefined) {
    throw new Error(`The component '${name}' is unknown`);
  }

  return component;
}

export function getTypeOf(value, options) {
  if (isComponentClassOrInstance(value)) {
    return value.getComponentName();
  }

  return coreGetTypeOf(value, options);
}

export function getHumanTypeOf(value) {
  return getTypeOf(value, {humanize: true});
}

export function composeDescription(description) {
  ow(description, 'description', ow.array);

  let composedDescription = compact(description).join(', ');

  if (composedDescription !== '') {
    composedDescription = ` (${composedDescription})`;
  }

  return composedDescription;
}

import ow from 'ow';

export function isComponent(object) {
  return typeof object?.constructor?.isComponent === 'function';
}

const COMPONENT_NAME_PATTERN = /^[A-Z_$][A-Z_$a-z0-9]*$/;

export function validateComponentName(componentName) {
  ow(componentName, 'componentName', ow.string);

  if (componentName === '') {
    throw new Error('A component name cannot be empty');
  }

  if (componentName === 'Component') {
    throw new Error("A component name cannot be 'Component'");
  }

  if (!COMPONENT_NAME_PATTERN.test(componentName)) {
    throw new Error(`The specified component name ('${componentName}') is invalid`);
  }
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

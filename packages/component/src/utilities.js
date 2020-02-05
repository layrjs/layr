export function isComponent(object) {
  return typeof object?.constructor?.isComponent === 'function';
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

import compact from 'lodash/compact';
import ow from 'ow';

export function isModelClass(object) {
  return typeof object?.isModel === 'function';
}

export function isModelInstance(object) {
  return isModelClass(object?.constructor);
}

export function isModel(object) {
  return isModelInstance(object);
}

export function isModelClassOrInstance(object) {
  return isModelClass(object) || isModelInstance(object);
}

export function isModelAttributeClass(object) {
  return typeof object?.isModelAttribute === 'function';
}

export function isModelAttribute(object) {
  return isModelAttributeClass(object?.constructor) === true;
}

export function joinModelAttributePath(path) {
  ow(path, 'path', ow.array);

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

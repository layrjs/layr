import compact from 'lodash/compact';
import ow from 'ow';

export function isModelClass(object) {
  return typeof object?.isModel === 'function';
}

export function isModel(object) {
  return isModelClass(object?.constructor) === true;
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

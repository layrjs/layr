import compact from 'lodash/compact';
import ow from 'ow';

export function joinFieldPath(path) {
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

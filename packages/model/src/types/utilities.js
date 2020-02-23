import {isComponent, getComponentName} from '@liaison/component';

export function getTypeOf(value) {
  if (Array.isArray(value)) {
    return 'array';
  }

  if (value instanceof Date) {
    return 'date';
  }

  if (value instanceof RegExp) {
    return 'regExp';
  }

  if (value instanceof Error) {
    return 'error';
  }

  if (isComponent(value?.prototype) || isComponent(value)) {
    return getComponentName(value);
  }

  return typeof value;
}

import {getTypeOf} from 'core-helpers';

export function isRoutableClass(object) {
  return typeof object?.isRoutable === 'function';
}

export function isRoutable(object) {
  return isRoutableClass(object?.constructor) === true;
}

export function isRouteClass(object) {
  return typeof object?.isRoute === 'function';
}

export function isRoute(object) {
  return isRouteClass(object?.constructor) === true;
}

export function normalizeURL(url) {
  if (url instanceof URL) {
    return url;
  }

  if (typeof url !== 'string') {
    throw new Error(
      `Expected a string or an URL instance, but received a value of type '${getTypeOf(url)}'`
    );
  }

  try {
    return new URL(url, 'liaison:/');
  } catch (error) {
    throw new Error(`The specified URL is invalid (URL: '${url}')`);
  }
}

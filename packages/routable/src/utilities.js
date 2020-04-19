import {getTypeOf} from 'core-helpers';

const LIAISON_PROTOCOL = 'liaison:';

export function isRoutableClass(object) {
  return typeof object?.isRoutable === 'function';
}

export function isRoutable(object) {
  return isRoutableClass(object?.constructor) === true;
}

export function validateIsRoutableClass(Routable) {
  if (!isRoutableClass(Routable)) {
    throw new Error(
      `Expected a routable class, but received a value of type '${getTypeOf(Routable)}'`
    );
  }
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
    return new URL(url, `${LIAISON_PROTOCOL}/`);
  } catch (error) {
    throw new Error(`The specified URL is invalid (URL: '${url}')`);
  }
}

export function stringifyURL(url) {
  if (!(url instanceof URL)) {
    throw new Error(`Expected an URL instance, but received a value of type '${getTypeOf(url)}'`);
  }

  let urlString = url.toString();

  if (urlString.startsWith(LIAISON_PROTOCOL)) {
    urlString = urlString.slice(LIAISON_PROTOCOL.length);
  }

  return urlString;
}

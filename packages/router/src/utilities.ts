import qs from 'qs';
import {getTypeOf} from 'core-helpers';

import type {Router} from './router';

const LIAISON_PROTOCOL = 'liaison:';

/**
 * Returns whether the specified value is a router class.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isRouterClass(value: any): value is typeof Router {
  return typeof value?.isRouter === 'function';
}

/**
 * Returns whether the specified value is a router instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isRouterInstance(value: any): value is Router {
  return typeof value?.constructor?.isRouter === 'function';
}

export function normalizeURL(url: URL | string) {
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

export function stringifyURL(url: URL) {
  if (!(url instanceof URL)) {
    throw new Error(`Expected an URL instance, but received a value of type '${getTypeOf(url)}'`);
  }

  let urlString = url.toString();

  if (urlString.startsWith(LIAISON_PROTOCOL)) {
    urlString = urlString.slice(LIAISON_PROTOCOL.length);
  }

  return urlString;
}

export function parseQuery<T extends object = object>(queryString: string) {
  if (queryString.startsWith('?')) {
    queryString = queryString.slice(1);
  }

  return qs.parse(queryString) as T;
}

export function stringifyQuery(query: object | undefined) {
  return qs.stringify(query);
}

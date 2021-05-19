import qs from 'qs';
import {getTypeOf} from 'core-helpers';

import type {Navigator} from './navigator';

const INTERNAL_LAYR_BASE_URL = 'http://internal.layr';

/**
 * Returns whether the specified value is a navigator class.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isNavigatorClass(value: any): value is typeof Navigator {
  return typeof value?.isNavigator === 'function';
}

/**
 * Returns whether the specified value is a navigator instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isNavigatorInstance(value: any): value is Navigator {
  return typeof value?.constructor?.isNavigator === 'function';
}

export function assertIsNavigatorInstance(value: any): asserts value is Navigator {
  if (!isNavigatorInstance(value)) {
    throw new Error(
      `Expected a navigator instance, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

export function normalizeURL(url: URL | string) {
  if (url instanceof URL) {
    return url;
  }

  if (typeof url !== 'string') {
    throw new Error(
      `Expected a string or a URL instance, but received a value of type '${getTypeOf(url)}'`
    );
  }

  try {
    return new URL(url, `${INTERNAL_LAYR_BASE_URL}/`);
  } catch (error) {
    throw new Error(`The specified URL is invalid (URL: '${url}')`);
  }
}

export function stringifyURL(url: URL) {
  if (!(url instanceof URL)) {
    throw new Error(`Expected a URL instance, but received a value of type '${getTypeOf(url)}'`);
  }

  let urlString = url.toString();

  if (urlString.startsWith(INTERNAL_LAYR_BASE_URL)) {
    urlString = urlString.slice(INTERNAL_LAYR_BASE_URL.length);
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

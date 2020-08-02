import qs from 'qs';
import {getTypeOf} from 'core-helpers';

import type {AbstractRouter} from './abstract-router';

const LIAISON_PROTOCOL = 'liaison:';

export function isRouterClass(value: any): value is typeof AbstractRouter {
  return typeof value?.isRouter === 'function';
}

export function isRouterInstance(value: any): value is AbstractRouter {
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

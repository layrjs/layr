import {fork as simpleFork, ForkOptions as SimpleForkOptions} from 'simple-forking';

import type {Component} from './component';
import {isComponentClass, isComponentInstance} from './utilities';

export type ForkOptions = SimpleForkOptions & {
  parentComponent?: typeof Component | Component;
};

export function fork(value: any, options: ForkOptions = {}) {
  const {objectForker: originalObjectForker, ...otherOptions} = options;

  const objectForker = function (object: object): object | void {
    if (originalObjectForker !== undefined) {
      const forkedObject = originalObjectForker(object);

      if (forkedObject !== undefined) {
        return forkedObject;
      }
    }

    if (isComponentClass(object)) {
      return object.fork();
    }

    if (isComponentInstance(object)) {
      return object.fork(options);
    }
  };

  return simpleFork(value, {...otherOptions, objectForker});
}

import {fork as simpleFork, ForkOptions as SimpleForkOptions} from 'simple-forking';

import type {Component} from './component';
import {isComponentClass, isComponentInstance} from './utilities';

export type ForkOptions = SimpleForkOptions & {
  componentProvider?: typeof Component;
  componentClass?: typeof Component;
};

/**
 * Fork any type of values including objects, arrays, and components (using Component's `fork()` [class method](https://liaison.dev/docs/v1/reference/component#fork-class-method) and [instance method](https://liaison.dev/docs/v1/reference/component#fork-instance-method)).
 *
 * @param value A value of any type.
 *
 * @returns A fork of the specified value.
 *
 * @example
 * ```
 * import {fork} from '﹫liaison/component';
 *
 * const data = {
 *   token: 'xyz123',
 *   timestamp: 1596600889609,
 *   movie: new Movie({title: 'Inception'})
 * };
 *
 * const dataFork = fork(data);
 * Object.getPrototypeOf(dataFork); // => data
 * dataFork.token; // => 'xyz123';
 * dataFork.timestamp; // => 1596600889609
 * dataFork.movie.isForkOf(data.movie); // => true
 * ```
 *
 * @category Forking
 */
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
      return object.fork(options);
    }

    if (isComponentInstance(object)) {
      return object.fork(options);
    }
  };

  return simpleFork(value, {...otherOptions, objectForker});
}

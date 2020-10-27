import {merge as simpleMerge, MergeOptions} from 'simple-forking';

import type {Component} from './component';
import {isComponentClass, isComponentInstance} from './utilities';

export {MergeOptions};

/**
 * Deeply merge any type of forks including objects, arrays, and components (using Component's `merge()` [class method](https://layrjs.com/docs/v1/reference/component#merge-class-method) and [instance method](https://layrjs.com/docs/v1/reference/component#merge-instance-method)) into their original values.
 *
 * @param value An original value of any type.
 * @param forkedValue A fork of `value`.
 *
 * @returns The original value.
 *
 * @example
 * ```
 * import {fork, merge} from '﹫layr/component';
 *
 * const data = {
 *   token: 'xyz123',
 *   timestamp: 1596600889609,
 *   movie: new Movie({title: 'Inception'})
 * };
 *
 * const dataFork = fork(data);
 * dataFork.token = 'xyz456';
 * dataFork.movie.title = 'Inception 2';
 *
 * data.token; // => 'xyz123'
 * data.movie.title; // => 'Inception'
 * merge(data, dataFork);
 * data.token; // => 'xyz456'
 * data.movie.title; // => 'Inception 2'
 * ```
 *
 * @category Merging
 */
export function merge(value: any, forkedValue: any, options: MergeOptions = {}) {
  const {
    objectMerger: originalObjectMerger,
    objectCloner: originalObjectCloner,
    ...otherOptions
  } = options;

  const objectMerger = function (object: object, forkedObject: object): object | void {
    if (originalObjectMerger !== undefined) {
      const mergedObject = originalObjectMerger(object, forkedObject);

      if (mergedObject !== undefined) {
        return mergedObject;
      }
    }

    if (isComponentClass(object)) {
      return object.merge(forkedObject as typeof Component, options);
    }

    if (isComponentInstance(object)) {
      return object.merge(forkedObject as Component, options);
    }
  };

  const objectCloner = function (object: object): object | void {
    if (originalObjectCloner !== undefined) {
      const clonedObject = originalObjectCloner(object);

      if (clonedObject !== undefined) {
        return clonedObject;
      }
    }

    if (isComponentClass(object)) {
      return object.clone();
    }

    if (isComponentInstance(object)) {
      return object.clone(options);
    }
  };

  return simpleMerge(value, forkedValue, {...otherOptions, objectMerger, objectCloner});
}

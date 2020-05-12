import {merge as simpleMerge, MergeOptions} from 'simple-forking';

import type {Component} from './component';
import {isComponentClass, isComponentInstance} from './utilities';

export {MergeOptions};

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

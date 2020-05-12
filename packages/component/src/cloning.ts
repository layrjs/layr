import {clone as simpleClone, CloneOptions} from 'simple-cloning';

import {isComponentClass, isComponentInstance} from './utilities';

export {CloneOptions};

export function clone(value: any, options: CloneOptions = {}): any {
  const {objectCloner: originalObjectCloner, ...otherOptions} = options;

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

  return simpleClone(value, {...otherOptions, objectCloner});
}

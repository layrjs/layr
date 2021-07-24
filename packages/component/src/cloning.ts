import {clone as simpleClone, CloneOptions} from 'simple-cloning';

import {isComponentClass, isComponentInstance} from './utilities';

export {CloneOptions};

/**
 * Deeply clones any type of values including objects, arrays, and component instances (using Component's [`clone()`](https://layrjs.com/docs/v2/reference/component#clone-instance-method) instance method).
 *
 * @param value A value of any type.
 *
 * @returns A clone of the specified value.
 *
 * @example
 * ```
 * import {clone} from '﹫layr/component';
 *
 * const data = {
 *   token: 'xyz123',
 *   timestamp: 1596600889609,
 *   movie: new Movie({title: 'Inception'})
 * };
 *
 * const dataClone = clone(data);
 * dataClone.token; // => 'xyz123';
 * dataClone.timestamp; // => 1596600889609
 * dataClone.movie; // => A clone of data.movie
 * ```
 *
 * @category Cloning
 * @possiblyasync
 */
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

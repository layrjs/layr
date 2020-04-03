import {Method} from '@liaison/component';

import {StorablePropertyMixin} from './storable-property';

export const StorableMethodMixin = Base =>
  class StorableMethodMixin extends StorablePropertyMixin(Base) {
    static isStorableMethod(object) {
      return isStorableMethod(object);
    }
  };

export class StorableMethod extends StorableMethodMixin(Method) {}

export function isStorableMethodClass(object) {
  return typeof object?.isStorableMethod === 'function';
}

export function isStorableMethod(object) {
  return isStorableMethodClass(object?.constructor) === true;
}

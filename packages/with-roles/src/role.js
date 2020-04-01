import {possiblyAsync} from 'possibly-async';
import {isPrototypeOf, getTypeOf} from 'core-helpers';
import {inspect} from 'util';
import ow from 'ow';

import {isRole} from './utilities';

export class Role {
  constructor(parent, name, resolver, options = {}) {
    ow(parent, 'parent', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(resolver, 'resolver', ow.function);
    ow(options, 'options', ow.object.exactShape({}));

    this._parent = parent;
    this._name = name;
    this._resolver = resolver;
  }

  getParent() {
    return this._parent;
  }

  getName() {
    return this._name;
  }

  getResolver() {
    return this._resolver;
  }

  resolve() {
    if (this._hasBeenResolved) {
      return this._resolvedValue;
    }

    return possiblyAsync(this._resolver.call(this._parent), {
      then: resolvedValue => {
        this._resolvedValue = resolvedValue;
        this._hasBeenResolved = true;

        return resolvedValue;
      }
    });
  }

  fork(parent) {
    ow(parent, 'parent', ow.object);

    const forkedRole = Object.create(this);

    forkedRole._parent = parent;

    return forkedRole;
  }

  isForkOf(role) {
    if (!isRole(role)) {
      throw new Error(`Expected a role, but received a value of type '${getTypeOf(role)}'`);
    }

    return isPrototypeOf(role, this);
  }

  static isRole(object) {
    return isRole(object);
  }

  [inspect.custom]() {
    return {name: this._name, resolver: this._resolver};
  }
}

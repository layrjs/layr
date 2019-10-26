import ow from 'ow';

import {isExposed} from './registerable';

export class Property {
  constructor(parent, name, options = {}) {
    ow(parent, ow.object);
    ow(name, ow.string.nonEmpty);
    ow(options, ow.object);

    const {expose, ...unknownOptions} = options;

    this._options = options;

    const unknownOption = Object.keys(unknownOptions)[0];
    if (unknownOption) {
      throw new Error(`'${unknownOption}' option is unknown (field: '${name}')`);
    }

    this._parent = parent;
    this._name = name;

    if (expose !== undefined) {
      parent.$exposeProperty(name, expose);
    }
  }

  fork(parent) {
    const forkedField = Object.create(this);
    forkedField._parent = parent;
    return forkedField;
  }

  getParent() {
    return this._parent;
  }

  getName() {
    return this._name;
  }

  getLayer({throwIfNotFound} = {}) {
    return this._parent.$getLayer({throwIfNotFound});
  }

  getOptions() {
    return this._options;
  }

  isExposed() {
    return isExposed(this._parent, this._name);
  }

  static isProperty(object) {
    return isProperty(object);
  }
}

export function isProperty(object) {
  return typeof object?.constructor?.isProperty === 'function';
}

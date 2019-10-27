import {possiblyAsync} from 'possibly-async';
import isEmpty from 'lodash/isEmpty';
import mapValues from 'lodash/mapValues';
import ow from 'ow';

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
      this.setExposition(expose);
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

  getExposition() {
    return this._exposition;
  }

  setExposition(exposition) {
    this._exposition = this._normalizeExposition(exposition);
  }

  _normalizeExposition(exposition) {
    const setting = ow.optional.any(ow.boolean, ow.string, ow.array);
    ow(exposition, ow.object.exactShape({get: setting, set: setting, call: setting}));

    let normalizedExposition = {};

    for (const [operation, setting] of Object.entries(exposition)) {
      const normalizedSetting = this._parent.$normalizePropertyOperationSetting(setting);
      if (normalizedSetting !== undefined) {
        normalizedExposition[operation] = normalizedSetting;
      }
    }

    if (isEmpty(normalizedExposition)) {
      normalizedExposition = undefined;
    }

    return normalizedExposition;
  }

  isExposed() {
    return this._exposition !== undefined;
  }

  serializeExposition() {
    let serializedExposition = this._exposition;

    if (serializedExposition === undefined) {
      return undefined;
    }

    serializedExposition = mapValues(serializedExposition, setting =>
      this._parent.$serializePropertyOperationSetting(setting)
    );

    return serializedExposition;
  }

  operationIsAllowed(operation) {
    const setting = this._exposition?.[operation];

    if (setting === undefined) {
      return false;
    }

    return possiblyAsync(this._parent.$resolvePropertyOperationSetting(setting), {
      then: resolvedSetting => resolvedSetting === true
    });
  }

  static isProperty(object) {
    return isProperty(object);
  }
}

export function isProperty(object) {
  return typeof object?.constructor?.isProperty === 'function';
}

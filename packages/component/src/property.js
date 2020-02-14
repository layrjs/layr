import {possiblyAsync} from 'possibly-async';
import isEmpty from 'lodash/isEmpty';
import mapValues from 'lodash/mapValues';
import ow from 'ow';

export class Property {
  constructor(name, parent, options) {
    ow(name, 'name', ow.string.nonEmpty);
    ow(parent, 'parent', ow.object);
    ow(options, 'options', ow.optional.object);

    this._name = name;
    this._parent = parent;

    if (options !== undefined) {
      this.setOptions(options);
    }
  }

  // === Basic properties ===

  getName() {
    return this._name;
  }

  getParent() {
    return this._parent;
  }

  // === Options ===

  setOptions(options = {}) {
    ow(options, 'options', ow.object.exactShape({exposure: ow.optional.object}));

    const {exposure} = options;

    if (exposure !== undefined) {
      this.setExposure(exposure);
    }
  }

  // === Exposure ===

  getExposure() {
    return this._exposure;
  }

  setExposure(exposure = {}) {
    this._exposure = this._normalizeExposure(exposure);
  }

  _normalizeExposure(exposure) {
    const setting = ow.optional.any(ow.boolean, ow.string, ow.array);
    ow(exposure, 'exposure', ow.object.exactShape({get: setting, set: setting, call: setting}));

    let normalizedExposure = {};

    for (const [operation, setting] of Object.entries(exposure)) {
      const normalizedSetting = this._parent.normalizePropertyOperationSetting(setting);
      if (normalizedSetting !== undefined) {
        normalizedExposure[operation] = normalizedSetting;
      }
    }

    if (isEmpty(normalizedExposure)) {
      normalizedExposure = undefined;
    }

    return normalizedExposure;
  }

  isExposed() {
    return this._exposure !== undefined;
  }

  operationIsAllowed(operation) {
    const setting = this._exposure?.[operation];

    if (setting === undefined) {
      return false;
    }

    return possiblyAsync(this._parent.resolvePropertyOperationSetting(setting), {
      then: resolvedSetting => resolvedSetting === true
    });
  }

  serializeExposure() {
    return mapValues(this._exposure ?? {}, setting =>
      this._parent.serializePropertyOperationSetting(setting)
    );
  }

  // === Forking ===

  fork(parent) {
    ow(parent, 'parent', ow.object);

    const forkedProperty = Object.create(this);
    forkedProperty._parent = parent;
    return forkedProperty;
  }

  // === Utilities ===

  static isProperty(object) {
    return isProperty(object);
  }
}

export function isProperty(object) {
  return typeof object?.constructor?.isProperty === 'function';
}

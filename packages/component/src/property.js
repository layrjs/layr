import {possiblyAsync} from 'possibly-async';
import mapValues from 'lodash/mapValues';
import ow from 'ow';

import {getTypeOf} from './utilities';

export class Property {
  constructor(name, parent, options = {}) {
    ow(name, 'name', ow.string.nonEmpty);
    ow(parent, 'parent', ow.object);
    ow(options, 'options', ow.optional.object);

    this._name = name;
    this._parent = parent;

    this.setOptions(options);
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

    let normalizedExposure;

    for (const [operation, setting] of Object.entries(exposure)) {
      if (setting === undefined) {
        continue;
      }

      const normalizedSetting = this._parent.normalizePropertyOperationSetting(setting);

      if (normalizedSetting === undefined) {
        continue;
      }

      if (normalizedExposure === undefined) {
        normalizedExposure = {};
      }

      normalizedExposure[operation] = normalizedSetting;
    }

    return normalizedExposure;
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

  // === Forking ===

  fork(parent) {
    ow(parent, 'parent', ow.object);

    const forkedProperty = Object.create(this);
    forkedProperty._parent = parent;
    return forkedProperty;
  }

  // === Introspection ===

  introspect() {
    const introspectedExposure = this.introspectExposure();

    if (introspectedExposure === undefined) {
      return undefined;
    }

    return {
      name: this.getName(),
      type: getTypeOf(this),
      exposure: introspectedExposure
    };
  }

  introspectExposure() {
    const exposure = this.getExposure();

    if (exposure === undefined) {
      return undefined;
    }

    // We don't want to expose backend operation settings to the frontend
    // So if there is a {call: 'admin'} exposure, we want to return {call: true}
    const introspectedExposure = mapValues(exposure, () => true);

    return introspectedExposure;
  }

  // === Utilities ===

  static isProperty(object) {
    return isProperty(object);
  }
}

export function isPropertyClass(object) {
  return typeof object?.isProperty === 'function';
}

export function isProperty(object) {
  return isPropertyClass(object?.constructor) === true;
}

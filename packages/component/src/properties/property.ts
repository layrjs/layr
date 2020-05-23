import {possiblyAsync} from 'possibly-async';
import {assertIsString, assertNoUnknownOptions, PlainObject} from 'core-helpers';

import type {Component} from '../component';
import {ensureComponentClass, assertIsComponentClassOrInstance} from '../utilities';

export type PropertyOptions = {
  exposure?: PropertyExposure;
};

export type PropertyExposure = Partial<Record<PropertyOperation, PropertyOperationSetting>>;

export type PropertyOperation = 'get' | 'set' | 'call';

export type PropertyOperationSetting = boolean | string | string[];

export type PropertyFilter = (property: any) => boolean | PromiseLike<boolean>;
export type PropertyFilterSync = (property: any) => boolean;
export type PropertyFilterAsync = (property: any) => PromiseLike<boolean>;

export class Property {
  private _name: string;
  private _parent: typeof Component | Component;

  constructor(name: string, parent: typeof Component | Component, options: PropertyOptions = {}) {
    assertIsString(name);
    assertIsComponentClassOrInstance(parent);

    this._name = name;
    this._parent = parent;

    this.setOptions(options);
  }

  getName() {
    return this._name;
  }

  getParent() {
    return this._parent;
  }

  // === Options ===

  setOptions(options: PropertyOptions = {}) {
    const {exposure, ...unknownOptions} = options;

    assertNoUnknownOptions(unknownOptions);

    if (exposure !== undefined) {
      this.setExposure(exposure);
    }
  }

  // === Exposure ===

  private _exposure?: PropertyExposure;

  getExposure() {
    return this._exposure;
  }

  setExposure(exposure = {}) {
    this._exposure = this._normalizeExposure(exposure);
  }

  private _normalizeExposure(exposure: PropertyExposure) {
    let normalizedExposure: PlainObject | undefined;

    for (const [operation, setting] of Object.entries(exposure)) {
      if (setting === undefined) {
        continue;
      }

      const normalizedSetting = ensureComponentClass(
        this._parent
      ).normalizePropertyOperationSetting(setting);

      if (normalizedSetting === undefined) {
        continue;
      }

      if (normalizedExposure === undefined) {
        normalizedExposure = {};
      }

      normalizedExposure[operation] = normalizedSetting;
    }

    return normalizedExposure as PropertyExposure | undefined;
  }

  operationIsAllowed(operation: PropertyOperation) {
    const setting = this._exposure?.[operation];

    if (setting === undefined) {
      return false;
    }

    return possiblyAsync(
      this._parent.resolvePropertyOperationSetting(setting),
      (resolvedSetting) => resolvedSetting === true
    );
  }

  // === Forking ===

  fork<T extends Property>(this: T, parent: typeof Component | Component) {
    const forkedProperty = Object.create(this) as T;

    forkedProperty._parent = parent;

    return forkedProperty;
  }

  // === Introspection ===

  // introspect() {
  //   const introspectedExposure = this.introspectExposure();

  //   if (introspectedExposure === undefined) {
  //     return undefined;
  //   }

  //   return {
  //     name: this.getName(),
  //     type: getTypeOf(this),
  //     exposure: introspectedExposure
  //   };
  // }

  // introspectExposure() {
  //   const exposure = this.getExposure();

  //   if (exposure === undefined) {
  //     return undefined;
  //   }

  //   // We don't want to expose backend operation settings to the frontend
  //   // So if there is a {call: 'admin'} exposure, we want to return {call: true}
  //   const introspectedExposure = mapValues(exposure, () => true);

  //   return introspectedExposure;
  // }

  // static unintrospect(introspectedProperty) {
  //   ow(
  //     introspectedProperty,
  //     'introspectedProperty',
  //     ow.object.exactShape({name: ow.string.nonEmpty, exposure: ow.optional.object})
  //   );

  //   const {name, ...options} = introspectedProperty;

  //   return {name, options};
  // }

  // === Utilities ===

  static isProperty(value: any): value is Property {
    return isPropertyInstance(value);
  }

  describeType() {
    return 'property';
  }

  describe() {
    return `${this.getParent().describeComponent()}, ${this.describeType()}: '${this.getName()}'`;
  }
}

export function isPropertyClass(value: any): value is typeof Property {
  return typeof value?.isProperty === 'function';
}

export function isPropertyInstance(value: any): value is Property {
  return isPropertyClass(value?.constructor) === true;
}

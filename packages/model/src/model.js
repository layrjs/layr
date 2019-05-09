import {inspect} from 'util';
import {Registerable, Serializable} from '@storable/registry';
import {FieldMask, callWithOneOrMany, findFromOneOrMany} from '@storable/util';
import isEmpty from 'lodash/isEmpty';

import {Field} from './field';

export class Model extends Serializable(Registerable()) {
  constructor(object = {}, {fields, deserialize, ...options} = {}) {
    super(object, {deserialize, ...options});

    this._activeFields = new Set();
    this._fieldValues = {};
    this._fieldSources = {};
    this._savedFieldValues = {};
    this._modelInitialized = true;

    if (deserialize) {
      return;
    }

    const rootFields = fields !== undefined ? new FieldMask(fields) : undefined;

    this.constructor.forEachField(field => {
      let fields;
      if (rootFields) {
        fields = rootFields.get(field.name);
        if (!fields) {
          return;
        }
      }

      if (!Object.prototype.hasOwnProperty.call(object, field.name)) {
        const defaultValue = field.getDefaultValue(this);
        this._setFieldValue(field, defaultValue);
        return;
      }

      let value = object[field.name];
      value = field.createValue(this, value, {fields});
      this._setFieldValue(field, value);
    });
  }

  assign(object) {
    if (object === undefined) {
      // NOOP
    } else if (object.isOfType && object.isOfType('Model')) {
      this._assignOther(object);
    } else {
      this._assignObject(object);
    }
  }

  _assignObject(object) {
    for (const [name, value] of Object.entries(object)) {
      const field = this.constructor.getField(name, {throwIfNotFound: false});
      if (field) {
        this._setFieldValue(field, value);
      }
    }
  }

  _assignOther(other) {
    other.forEachField(otherField => {
      const field = this.constructor.getField(otherField.name, {throwIfNotFound: false});
      if (field) {
        const value = other._getFieldValue(otherField);
        this._setFieldValue(field, value);
      }
    });
  }

  clone() {
    return this.constructor.deserialize(this.serialize());
  }

  // === Serialization ===

  serialize({target, fieldFilter, _isDeep, ...otherOptions} = {}) {
    if (!_isDeep) {
      this.validate({fieldFilter});
    }

    const fields = {};

    this.forEachField(
      field => {
        if (target !== undefined) {
          const source = this._getFieldSource(field);
          if (target === source) {
            return;
          }
        }

        let value = this._getFieldValue(field);
        value = field.serializeValue(this, value, {
          target,
          fieldFilter,
          _isDeep: true,
          ...otherOptions
        });
        fields[field.name] = value;
      },
      {filter: fieldFilter}
    );

    return {...super.serialize({target, _isDeep, ...otherOptions}), ...fields};
  }

  static deserialize(object, {source, previousInstance} = {}) {
    const instance = this.getInstance(object, previousInstance);
    if (instance) {
      instance.deserialize(object, {source});
      return instance;
    }
    return super.deserialize(object, {source});
  }

  deserialize(object = {}, {source} = {}) {
    super.deserialize(object);

    const isNew = this.isNew();

    this.constructor.forEachField(field => {
      if (!Object.prototype.hasOwnProperty.call(object, field.name)) {
        if (isNew) {
          const defaultValue = field.getDefaultValue(this);
          this._setFieldValue(field, defaultValue);
        }
        return;
      }

      let value = object[field.name];
      const previousValue = this._getFieldValue(field, {throwIfNotActive: false});
      value = field.deserializeValue(this, value, {source, previousValue});
      this._setFieldValue(field, value, {source});
    });
  }

  static getInstance(object, previousInstance) {
    if (previousInstance?.constructor === this) {
      return previousInstance;
    }
  }

  // === Core ===

  static defineField(name, type, options, descriptor) {
    if (descriptor.initializer) {
      options = {...options, default: descriptor.initializer};
    }

    const field = this.setField(name, type, options);

    descriptor.get = function () {
      return this._getFieldValue(field);
    };
    descriptor.set = function (val) {
      return this._setFieldValue(field, val);
    };

    delete descriptor.initializer;
    delete descriptor.writable;
  }

  static getField(name, {throwIfNotFound = true} = {}) {
    const field = this._fields?.[name];
    if (field) {
      return field;
    }
    if (throwIfNotFound) {
      throw new Error(`Field not found (name: '${name}'), model: ${this.getRegisteredName()}`);
    }
  }

  getField(name, {throwIfNotFound = true} = {}) {
    const field = this.constructor.getField(name, {throwIfNotFound});
    if (field) {
      if (this._fieldIsActive(field)) {
        return field;
      }
      if (throwIfNotFound) {
        throw new Error(
          `Field not active (name: '${name}'), model: ${this.constructor.getRegisteredName()}`
        );
      }
    }
  }

  static setField(name, type, options) {
    if (!Object.prototype.hasOwnProperty.call(this, '_fields')) {
      this._fields = {...this._fields};
    }
    let field = this._fields[name];
    if (field) {
      throw new Error(`Field already exists (name: '${name}')`);
    }
    field = new Field(name, type, options);
    this._fields[name] = field;
    return field;
  }

  _activateField(field) {
    this._activeFields.add(field.name);
  }

  _fieldIsActive(field) {
    return this._activeFields.has(field.name);
  }

  _fieldsAreActive(fields) {
    const rootFields = new FieldMask(fields);

    const result = this.constructor.forEachField(field => {
      const fields = rootFields.get(field.name);
      if (!fields) {
        return;
      }

      if (!this._fieldIsActive(field)) {
        return false;
      }

      const value = this._getFieldValue(field);
      if (value !== undefined) {
        const incompleteValue = findFromOneOrMany(value, value => {
          if (this.constructor.fieldValueIsSubmodel(value)) {
            return !value._fieldsAreActive(fields);
          }
        });
        if (incompleteValue !== undefined) {
          return false;
        }
      }
    });

    return result !== false;
  }

  static filterEntityFields(fields) {
    fields = new FieldMask(fields);
    fields = this._filterEntityFields(fields);
    return new FieldMask(fields);
  }

  static _filterEntityFields(rootFields) {
    const filteredFields = {};

    this.forEachField(field => {
      const fields = rootFields.get(field.name);
      if (!fields) {
        return;
      }

      if (field.scalar.isPrimitiveType()) {
        filteredFields[field.name] = true;
        return;
      }

      const Model = field.scalar.getModel(this._getRegistry());

      if (Model.prototype.isOfType('EntityModel')) {
        filteredFields[field.name] = {};
        return;
      }

      filteredFields[field.name] = Model._filterEntityFields(fields);
    });

    return filteredFields;
  }

  static forEachField(func) {
    if (this._fields) {
      for (const field of Object.values(this._fields)) {
        const result = func(field);
        if (result !== undefined) {
          // Early return if the function returned something
          return result;
        }
      }
    }
  }

  forEachField(func, {filter} = {}) {
    return this.constructor.forEachField(field => {
      if (this._fieldIsActive(field)) {
        if (filter && !filter.call(this, field)) {
          return;
        }
        return func(field);
      }
    });
  }

  static fieldValueIsSubmodel(value) {
    return value?.isOfType && !value.isOfType('EntityModel');
  }

  static fieldValueIsNestedEntity(value) {
    return value?.isOfType && value.isOfType('EntityModel');
  }

  forEachSubmodel(func) {
    return this.forEachField(field => {
      const value = this._getFieldValue(field);
      return callWithOneOrMany(value, value => {
        if (this.constructor.fieldValueIsSubmodel(value)) {
          return func(value);
        }
      });
    });
  }

  forEachNestedEntityDeep(func, {fields} = {}) {
    const rootFields = new FieldMask(fields);

    return this.constructor.forEachField(field => {
      const fields = rootFields.get(field.name);
      if (!fields) {
        return;
      }

      const value = this._getFieldValue(field);
      if (value !== undefined) {
        return callWithOneOrMany(value, value => {
          if (this.constructor.fieldValueIsNestedEntity(value)) {
            const result = func(value, {fields});
            if (result !== undefined) {
              return result;
            }
          }

          if (value?.isOfType && value.isOfType('Model')) {
            return value.forEachNestedEntityDeep(func, {fields});
          }
        });
      }
    });
  }

  _getFieldValue(field, {throwIfNotActive = true} = {}) {
    if (!this._fieldIsActive(field)) {
      if (throwIfNotActive) {
        throw new Error(
          `Field not active (name: '${field.name}'), model: ${this.constructor.getRegisteredName()}`
        );
      }
      return undefined;
    }

    const value = this._fieldValues[field.name];
    // if (value === undefined && field.isArray) {
    //   value = [];
    //   this._fieldValues[field.name] = value;
    // }
    return value;
  }

  _setFieldValue(field, value, {source = this.constructor.getRegistry().getName()} = {}) {
    field.checkValue(this, value);
    // if (!deserialize) {
    //   this._saveFieldValue(field);
    // }
    this._fieldValues[field.name] = value;
    this._setFieldSource(field, source);
    this._activateField(field);
    return value;
  }

  getFieldSource(name) {
    return this._getFieldSource(this.getField(name));
  }

  _getFieldSource(field) {
    return this._fieldSources[field.name];
  }

  setFieldSource(name, source) {
    return this._setFieldSource(this.getField(name), source);
  }

  _setFieldSource(field, source) {
    this._fieldSources[field.name] = source;
  }

  _saveFieldValue(field) {
    this._savedFieldValues[field.name] = this._fieldValues[field.name];
  }

  commit() {
    this._savedFieldValues = {};

    this.forEachSubmodel(submodel => {
      submodel.commit();
    });
  }

  rollback() {
    for (const [name, value] of Object.entries(this._savedFieldValues)) {
      this._fieldValues[name] = value;
    }
    this._savedFieldValues = {};

    this.forEachSubmodel(submodel => {
      submodel.rollback();
    });
  }

  isChanged() {
    return this._isChanged() === true;
  }

  _isChanged() {
    if (!isEmpty(this._savedFieldValues)) {
      return true;
    }

    return this.forEachSubmodel(submodel => submodel._isChanged());
  }

  fieldIsChanged(field) {
    if (Object.prototype.hasOwnProperty.call(this._savedFieldValues, field.name)) {
      return true;
    }

    const value = this._getFieldValue(field);
    if (value !== undefined) {
      const changedValue = findFromOneOrMany(value, value => {
        if (this.constructor.fieldValueIsSubmodel(value)) {
          return value.isChanged();
        }
      });
      if (changedValue !== undefined) {
        return true;
      }
    }

    return false;
  }

  static _getRegistry({throwIfNotFound = true} = {}) {
    if (!this.$registry && throwIfNotFound) {
      throw new Error(`Registry not found (model: ${this.getRegisteredName()})`);
    }
    return this.$registry;
  }

  // === Validation ===

  validate({fieldFilter} = {}) {
    const failedValidators = this.getFailedValidators({fieldFilter});
    if (failedValidators) {
      const error = new Error(
        `Model validation failed (model: '${this.constructor.getRegisteredName()}', failedValidators: ${JSON.stringify(
          failedValidators
        )})`
      );
      error.failedValidators = failedValidators;
      throw error;
    }
  }

  isValid({fieldFilter} = {}) {
    return this.getFailedValidators({fieldFilter}) === undefined;
  }

  getFailedValidators({fieldFilter} = {}) {
    let result;
    this.forEachField(
      field => {
        const value = this._getFieldValue(field);
        const failedValidators = field.validateValue(value, {fieldFilter});
        if (!isEmpty(failedValidators)) {
          if (!result) {
            result = {};
          }
          result[field.name] = failedValidators;
        }
      },
      {fieldFilter}
    );
    return result;
  }

  // === Remote invocation ===

  static remoteRegistry = 'remoteRegistry';

  static defineRemoteMethod(name, descriptor) {
    descriptor.value = async function (...args) {
      return this.callRemote(name, ...args);
    };
    delete descriptor.initializer;
    delete descriptor.writable;
  }

  static async callRemote(methodName, ...args) {
    const registry = this._getRegistry();
    const remoteRegistry = this._getRemoteRegistry();
    const query = {
      [`${this.getRegisteredName()}=>`]: {
        [`${methodName}=>result`]: {
          '([])': args
        }
      }
    };
    const {result} = await remoteRegistry.invokeQuery(query, {source: registry});
    return result;
  }

  async callRemote(methodName, ...args) {
    const registry = this.constructor._getRegistry();
    const remoteRegistry = this.constructor._getRemoteRegistry();
    const query = {
      '<=': this,
      [`${methodName}=>result`]: {
        '([])': args
      },
      '=>changes': true
    };
    const {result} = await remoteRegistry.invokeQuery(query, {source: registry});
    return result;
  }

  static _getRemoteRegistry() {
    const registry = this._getRegistry();
    const remoteRegistry = registry[this.remoteRegistry];
    if (!remoteRegistry) {
      throw new Error(
        `Remote registry not found (model: ${this.name}, remoteRegistry: ${this.remoteRegistry})`
      );
    }
    return remoteRegistry;
  }

  // === Utilities ===

  [inspect.custom]() {
    const object = {};
    this.forEachField(field => {
      const value = this._getFieldValue(field);
      if (value !== undefined) {
        object[field.name] = value;
      }
    });
    return object;
  }

  isOfType(name) {
    if (name === 'Model') {
      return true; // Optimization
    }

    let Model = this.constructor;
    while (Model) {
      if (Model.name === name) {
        return true;
      }
      Model = Object.getPrototypeOf(Model);
    }
    return false;
  }
}

// === Decorators ===

export function field(type, options) {
  return function (target, name, descriptor) {
    target.constructor.defineField(name, type, options, descriptor);
  };
}

export function remoteMethod() {
  return function (target, name, descriptor) {
    if (!(typeof target === 'function')) {
      // The target is the prototype
      target = target.constructor;
    }
    target.defineRemoteMethod(name, descriptor);
  };
}

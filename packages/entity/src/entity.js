import {Identity} from '@liaison/identity';
import {hasOwnProperty} from 'core-helpers';

export class Entity extends Identity {
  $serialize({target, fields, _isDeep} = {}) {
    if (_isDeep) {
      return this.$serializeReference({target});
    }
    return super.$serialize({target, fields});
  }

  $serializeReference({target} = {}) {
    if (this.$isNew()) {
      throw new Error(`Cannot serialize a reference to a new entity`);
    }
    return {...super.$serialize({target, fields: false}), _ref: true};
  }

  __createFieldMask(fieldMask, {filter, includeReferencedEntities, _typeStack}) {
    if (_typeStack.size > 0) {
      // We are not a the root
      if (!includeReferencedEntities) {
        // Ignore fields of referenced entities
        return {};
      }
    }

    return super.__createFieldMask(fieldMask, {filter, includeReferencedEntities, _typeStack});
  }

  __onIdValueSet(value) {
    this.__updateIndex('id', value);
  }

  __onUniqueFieldValueChange(name, value, previousValue) {
    this.__updateIndex(name, value, previousValue);
  }

  // === Identity mapping ===

  static $getInstance(object, _previousInstance) {
    if (this.$isDetached()) {
      return undefined;
    }

    if (object === undefined) {
      return undefined;
    }

    const getInstanceBy = name => {
      const value = object[name === 'id' ? '_id' : name];

      if (value === undefined) {
        return undefined;
      }

      const index = this.__getIndex(name);

      let instance = index[value];

      if (instance === undefined) {
        return undefined;
      }

      if (!hasOwnProperty(index, value)) {
        instance = instance.__fork(this);
        instance.__setIndexes();
      }

      return instance;
    };

    const instance = getInstanceBy('id');
    if (instance !== undefined) {
      return instance;
    }

    for (const field of this.prototype.$getUniqueFields()) {
      const name = field.getName();
      const instance = getInstanceBy(name);
      if (instance !== undefined) {
        return instance;
      }
    }
  }

  static $detach() {
    this.__deleteIndexes();
    return super.$detach();
  }

  static __getIndexes() {
    if (!this.__indexes) {
      this.__indexes = Object.create(null);
    } else if (!hasOwnProperty(this, '__indexes')) {
      this.__indexes = Object.create(this.__indexes);
    }
    return this.__indexes;
  }

  static __getIndex(name) {
    const indexes = this.__getIndexes();
    if (!indexes[name]) {
      indexes[name] = Object.create(null);
    } else if (!hasOwnProperty(indexes, name)) {
      indexes[name] = Object.create(indexes[name]);
    }
    return indexes[name];
  }

  static __deleteIndexes() {
    if (this.$isDetached()) {
      return;
    }

    this.__indexes = undefined;
  }

  __setIndexes() {
    const id = this._id;
    this.__setIndex('id', id);

    for (const field of this.$getUniqueFields()) {
      const name = field.getName();
      const value = field.getValue({throwIfInactive: false, forkIfNotOwned: false});
      this.__setIndex(name, value);
    }
  }

  __setIndex(name, value) {
    if (value === undefined) {
      return;
    }

    const index = this.constructor.__getIndex(name);
    index[value] = this;
  }

  __updateIndex(name, value, previousValue) {
    if (value === previousValue) {
      return;
    }

    if (this.$isDetached()) {
      return;
    }

    const index = this.constructor.__getIndex(name);

    if (previousValue !== undefined) {
      index[previousValue] = undefined;
    }

    if (value !== undefined) {
      if (index[value] !== undefined) {
        throw new Error(`Duplicate value found in a unique field (name: '${name}')`);
      }
      index[value] = this;
    }
  }

  __deleteIndexes() {
    const id = this._id;
    this.__deleteIndex('id', id);

    for (const field of this.$getUniqueFields()) {
      const name = field.getName();
      const value = field.getValue({throwIfInactive: false, forkIfNotOwned: false});
      this.__deleteIndex(name, value);
    }
  }

  __deleteIndex(name, value) {
    if (value === undefined) {
      return;
    }

    if (this.$isDetached()) {
      return;
    }

    const index = this.constructor.__getIndex(name);
    index[value] = undefined;
  }

  static $isEntity(object) {
    return isEntity(object);
  }
}

export function isEntity(object) {
  return typeof object?.constructor?.$isEntity === 'function';
}

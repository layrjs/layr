import {hasOwnProperty} from '@liaison/util';

import {Identity} from './identity';

export class Entity extends Identity {
  constructor(object, options) {
    super(object, options);

    this.constructor.$setInstance(this);
  }

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

  $clone() {
    return this.constructor.$deserialize({...this.$serialize(), _id: undefined});
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

  static $getInstance(object, _previousInstance) {
    const id = object?._id;

    if (id === undefined) {
      return undefined;
    }

    const instances = this.__getInstances();

    let instance = instances[id];

    if (instance && !hasOwnProperty(instances, id)) {
      instance = instance.__fork(this);
      instances[id] = instance;
    }

    return instance;
  }

  static $setInstance(instance) {
    const id = instance?._id;

    if (id === undefined) {
      return;
    }

    const instances = this.__getInstances();

    instances[id] = instance;
  }

  static __getInstances() {
    if (!this.__instances) {
      this.__instances = new Map();
    } else if (!hasOwnProperty(this, '__instances')) {
      this.__instances = Object.create(this.__instances);
    }
    return this.__instances;
  }

  static $isEntity(object) {
    return isEntity(object);
  }
}

export function isEntity(object) {
  return typeof object?.constructor?.$isEntity === 'function';
}

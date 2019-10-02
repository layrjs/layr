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
    return this.__getInstances().get(id);
  }

  static $setInstance(instance) {
    const id = instance?._id;
    if (id === undefined) {
      return;
    }
    this.__getInstances().set(id, instance);
  }

  static __getInstances() {
    if (!hasOwnProperty(this, '__instances')) {
      this.__instances = new Map();
    }
    return this.__instances;
  }
}

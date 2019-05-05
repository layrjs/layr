export const Serializable = (Base = Object) =>
  class Serializable extends Base {
    constructor(object, options) {
      super(object, options);
      this.initialize(object, options);
      this.constructor.saveInstance(this);
    }

    initialize(object, {_isDeserializing} = {}) {
      this._isNew = _isDeserializing ? Boolean(object?._new) : true;
    }

    isNew() {
      return this._isNew;
    }

    markAsNew() {
      this._isNew = true;
    }

    markAsNotNew() {
      this._isNew = false;
    }

    serialize(_options) {
      return {
        _type: this.constructor.getRegisteredName(),
        ...(this._isNew && {_new: true})
      };
    }

    toJSON() {
      return this.serialize();
    }

    static deserialize(object, {previousInstance, ...options} = {}) {
      const existingInstance = this.loadInstance(object, {previousInstance});
      if (existingInstance) {
        existingInstance.initialize(object, {_isDeserializing: true, ...options});
        return existingInstance;
      }

      return new this(object, {...options, _isDeserializing: true});
    }

    static loadInstance(_object, {previousInstance} = {}) {
      // Override this method to implement the identity map
      if (previousInstance?.constructor === this) {
        return previousInstance;
      }
    }

    static saveInstance(_instance) {
      // Override this method to implement the identity map
    }
  };

export function isSerializable(value) {
  return typeof value?.serialize === 'function';
}

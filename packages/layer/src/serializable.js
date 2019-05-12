export const Serializable = (Base = Object) =>
  class Serializable extends Base {
    constructor(object, {isDeserializing} = {}) {
      super(object);
      if (!isDeserializing) {
        this._isNew = true;
      }
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

    serialize() {
      return {
        _type: this.constructor.getRegisteredName(),
        ...(this._isNew && {_new: true})
      };
    }

    toJSON() {
      return this.serialize();
    }

    static deserialize(object) {
      const instance = new this(object, {isDeserializing: true});
      instance.deserialize(object);
      return instance;
    }

    deserialize(object) {
      this._isNew = Boolean(object?._new);
    }
  };

export function isSerializable(value) {
  return typeof value?.serialize === 'function';
}

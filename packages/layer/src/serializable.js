export const Serializable = (Base = Object) =>
  class Serializable extends Base {
    constructor(object, {deserialize, ...options} = {}) {
      super(object, options);
      if (!deserialize) {
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

    serialize(_options) {
      return {
        _type: this.constructor.getRegisteredName(),
        ...(this._isNew && {_new: true})
      };
    }

    toJSON() {
      return this.serialize();
    }

    static deserialize(object, options) {
      const instance = new this(object, {deserialize: true, ...options});
      instance.deserialize(object, options);
      return instance;
    }

    deserialize(object, _options) {
      this._isNew = Boolean(object?._new);
    }
  };

export function isSerializable(value) {
  return typeof value?.serialize === 'function';
}

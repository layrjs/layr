export const Serializable = (Base = Object) =>
  class Serializable extends Base {
    constructor(object, {isDeserializing} = {}) {
      super(object);
      if (!isDeserializing) {
        this._isNew = true;
      }
      // When overriding, call `this.constructor.$setInstance(this)` after setting the id
    }

    $isNew() {
      return this._isNew;
    }

    $markAsNew() {
      this._isNew = true;
    }

    $markAsNotNew() {
      this._isNew = false;
    }

    $serialize() {
      return {
        _type: this.constructor.$getRegisteredName(),
        ...(this._isNew && {_new: true})
      };
    }

    toJSON() {
      return this.$serialize();
    }

    static $deserialize(object, {previousInstance, ...otherOptions} = {}) {
      let instance = this.$getInstance(object, previousInstance);
      if (!instance) {
        instance = new this(object, {isDeserializing: true});
      }
      instance.$deserialize(object, otherOptions);
      return instance;
    }

    $deserialize(object) {
      this._isNew = Boolean(object?._new);
    }

    static $getInstance(_object, _previousInstance) {
      // Override to implement an identity map
    }

    static $setInstance(_instance) {
      // Override to implement an identity map
    }
  };

export function isSerializable(value) {
  return typeof value?.$serialize === 'function';
}

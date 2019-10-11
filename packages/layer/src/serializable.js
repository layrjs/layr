export const Serializable = (Base = Object) =>
  class Serializable extends Base {
    constructor(object) {
      super(object);

      this.__isNew = true;
    }

    $isNew() {
      return this.__isNew;
    }

    $markAsNew() {
      this.__isNew = true;
    }

    $markAsNotNew() {
      this.__isNew = false;
    }

    $serialize() {
      const registeredName = this.$getRegisteredName() || this.constructor.$getRegisteredName();

      return {
        _type: registeredName,
        ...(this.__isNew && {_new: true})
      };
    }

    toJSON() {
      return this.$serialize();
    }

    static $deserialize(object, {previousInstance, ...otherOptions} = {}) {
      let instance = this.$getInstance(object, previousInstance);
      if (!instance) {
        instance = Object.create(this.prototype);
        instance.constructor = this;
        this.$setInstance(instance);
      }
      instance.$deserialize(object, otherOptions);
      return instance;
    }

    $deserialize(object) {
      this.__isNew = Boolean(object?._new);
    }

    // eslint-disable-next-line no-unused-vars
    static $getInstance(object, previousInstance) {
      // Override to implement an identity map
    }

    // eslint-disable-next-line no-unused-vars
    static $setInstance(instance) {
      // Override to implement an identity map
    }
  };

export function isSerializable(value) {
  return typeof value?.$serialize === 'function';
}

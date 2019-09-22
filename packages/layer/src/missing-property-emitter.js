export let MissingPropertyEmitter = function () {};

const handler = {
  get(target, name, receiver) {
    if (Reflect.has(target, name)) {
      return Reflect.get(target, name, receiver);
    }
    return receiver.$onMissingProperty(name);
  }
};

MissingPropertyEmitter = new Proxy(MissingPropertyEmitter, handler);
MissingPropertyEmitter.prototype = new Proxy(MissingPropertyEmitter.prototype, handler);

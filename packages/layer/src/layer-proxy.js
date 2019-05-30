export class LayerProxy {
  constructor(target) {
    if (!target) {
      throw new Error(`'target' parameter is missing`);
    }
    this._target = target;
  }

  getId() {
    return this._target.getId();
  }

  getName() {
    return this._target.getName();
  }

  get(name, {throwIfNotFound = true} = {}) {
    return this._target.get(name, {throwIfNotFound});
  }

  receiveQuery(...args) {
    return this._target.receiveQuery(...args);
  }
}

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

  // getName() {
  //   return this._target.getName();
  // }

  receiveQuery(...args) {
    return this._target.receiveQuery(...args);
  }
}

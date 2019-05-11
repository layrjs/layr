export class LayerProxy {
  constructor(target) {
    if (!target) {
      throw new Error(`'target' parameter is missing`);
    }
    this._target = target;
  }

  getName() {
    return this._target.getName();
  }

  async receiveQuery(...args) {
    return await this._target.receiveQuery(...args);
  }
}

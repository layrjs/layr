export class RegistryProxy {
  constructor(targetProxy) {
    if (!targetProxy) {
      throw new Error(`'targetProxy' parameter is missing`);
    }
    this._targetProxy = targetProxy;
  }

  getName() {
    return this._targetProxy.getName();
  }

  async receiveQuery(...args) {
    return await this._targetProxy.receiveQuery(...args);
  }
}

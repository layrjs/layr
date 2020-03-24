export function isLayerServerClass(object) {
  return typeof object?.isLayerServer === 'function';
}

export function isLayerServer(object) {
  return isLayerServerClass(object?.constructor) === true;
}

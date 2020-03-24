export function isLayerClientClass(object) {
  return typeof object?.isLayerClient === 'function';
}

export function isLayerClient(object) {
  return isLayerClientClass(object?.constructor) === true;
}

export function isLayerClass(object) {
  return typeof object?.isLayer === 'function';
}

export function isLayer(object) {
  return isLayerClass(object?.constructor) === true;
}

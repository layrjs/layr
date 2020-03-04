export function isEntityClass(object) {
  return typeof object?.isEntity === 'function';
}

export function isEntity(object) {
  return isEntityClass(object?.constructor) === true;
}

export function isEntityClass(object) {
  return typeof object?.isEntity === 'function';
}

export function isEntityInstance(object) {
  return isEntityClass(object?.constructor);
}

export function isEntity(object) {
  return isEntityInstance(object);
}

export function isEntityClassOrInstance(object) {
  return isEntityClass(object) || isEntityInstance(object);
}

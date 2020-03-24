export function isComponentServerClass(object) {
  return typeof object?.isComponentServer === 'function';
}

export function isComponentServer(object) {
  return isComponentServerClass(object?.constructor) === true;
}

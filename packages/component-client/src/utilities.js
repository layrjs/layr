export function isComponentClientClass(object) {
  return typeof object?.isComponentClient === 'function';
}

export function isComponentClient(object) {
  return isComponentClientClass(object?.constructor) === true;
}

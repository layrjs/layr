export function isRouterClass(object) {
  return typeof object?.isRouter === 'function';
}

export function isRouter(object) {
  return isRouterClass(object?.constructor) === true;
}

export function isComponent(object) {
  return typeof object?.constructor?.isComponent === 'function';
}

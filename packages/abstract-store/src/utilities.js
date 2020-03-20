export function isStore(object) {
  return typeof object?.constructor?.isStore === 'function';
}

export function isWithRoles(object) {
  return typeof object?.isWithRoles === 'function';
}

export function isRole(object) {
  return typeof object?.constructor?.isRole === 'function';
}

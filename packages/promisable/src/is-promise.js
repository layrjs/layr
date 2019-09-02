export function isPromise(value) {
  return (
    ((typeof value === 'object' && value !== null) || typeof value === 'function') &&
    typeof value.then === 'function'
  );
}

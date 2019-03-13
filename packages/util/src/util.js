export function callOneOrMany(value, func) {
  if (Array.isArray(value)) {
    const values = value;
    return values.map(value => func(value));
  }
  return func(value);
}

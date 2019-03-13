export function mapFromOneOrMany(value, func) {
  if (Array.isArray(value)) {
    const values = value;
    return values.map(value => func(value));
  }
  return func(value);
}

export function findFromOneOrMany(value, func) {
  if (Array.isArray(value)) {
    const values = value;
    for (const value of values) {
      if (func(value)) {
        return value;
      }
    }
    return undefined;
  }
  return func(value) ? value : undefined;
}

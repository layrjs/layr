export function oneOrMany(value) {
  return Array.isArray(value) ? value : [value];
}

export function getFromOneOrMany(value, index) {
  if (index !== undefined) {
    const values = value;
    if (!Array.isArray(values)) {
      throw new Error('Expected an array');
    }
    return values[index];
  }
  if (Array.isArray(value)) {
    throw new Error('Expected an index');
  }
  return value;
}

export function callWithOneOrMany(value, func) {
  if (Array.isArray(value)) {
    const values = value;
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      const result = func(value, index);
      if (result !== undefined) {
        return result;
      }
    }
    return;
  }
  return func(value);
}

export async function callWithOneOrManyAsync(value, func) {
  if (Array.isArray(value)) {
    const values = value;
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      const result = await func(value, index);
      if (result !== undefined) {
        return result;
      }
    }
    return;
  }
  return await func(value);
}

export function mapFromOneOrMany(value, func) {
  if (Array.isArray(value)) {
    const values = value;
    const results = [];
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      const result = func(value, index);
      results.push(result);
    }
    return results;
  }
  return func(value);
}

export async function mapFromOneOrManyAsync(value, func) {
  if (Array.isArray(value)) {
    const values = value;
    const results = [];
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      const result = await func(value, index);
      results.push(result);
    }
    return results;
  }
  return await func(value);
}

export function findFromOneOrMany(value, func) {
  if (Array.isArray(value)) {
    const values = value;
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      if (func(value, index)) {
        return value;
      }
    }
    return undefined;
  }
  return func(value) ? value : undefined;
}

export async function findFromOneOrManyAsync(value, func) {
  if (Array.isArray(value)) {
    const values = value;
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      if (await func(value, index)) {
        return value;
      }
    }
    return undefined;
  }
  return (await func(value)) ? value : undefined;
}

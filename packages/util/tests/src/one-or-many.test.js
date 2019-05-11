import {
  oneOrMany,
  getFromOneOrMany,
  callWithOneOrMany,
  mapFromOneOrMany,
  findFromOneOrMany
} from '../../..';

describe('One or many', () => {
  test('oneOrMany()', () => {
    let results = [];
    for (const value of oneOrMany('aaa')) {
      results.push(value.toUpperCase());
    }
    expect(results).toEqual(['AAA']);

    results = [];
    for (const value of oneOrMany(['aaa', 'bbb', 'ccc'])) {
      results.push(value.toUpperCase());
    }
    expect(results).toEqual(['AAA', 'BBB', 'CCC']);
  });

  test('getFromOneOrMany()', () => {
    expect(getFromOneOrMany('aaa')).toBe('aaa');
    expect(() => getFromOneOrMany('aaa', 1)).toThrow(/Expected an array/);

    expect(getFromOneOrMany(['aaa', 'bbb'], 1)).toBe('bbb');
    expect(() => getFromOneOrMany(['aaa', 'bbb'])).toThrow(/Expected an index/);
  });

  test('callWithOneOrMany()', () => {
    let results = [];
    callWithOneOrMany('aaa', value => {
      results.push(value.toUpperCase());
    });
    expect(results).toEqual(['AAA']);

    results = [];
    callWithOneOrMany(['aaa', 'bbb', 'ccc'], value => {
      results.push(value.toUpperCase());
    });
    expect(results).toEqual(['AAA', 'BBB', 'CCC']);
  });

  test('mapFromOneOrMany()', () => {
    const result = mapFromOneOrMany('aaa', value => value.toUpperCase());
    expect(result).toBe('AAA');

    const results = mapFromOneOrMany(['aaa', 'bbb', 'ccc'], value => value.toUpperCase());
    expect(results).toEqual(['AAA', 'BBB', 'CCC']);
  });

  test('findFromOneOrMany()', () => {
    let result = findFromOneOrMany('aaa', value => value === 'aaa');
    expect(result).toBe('aaa');

    result = findFromOneOrMany('zzz', value => value === 'aaa');
    expect(result).toBeUndefined();

    result = findFromOneOrMany(['aaa', 'bbb', 'ccc'], value => value === 'bbb');
    expect(result).toEqual('bbb');

    result = findFromOneOrMany(['aaa', 'zzz', 'ccc'], value => value === 'bbb');
    expect(result).toBeUndefined();
  });
});

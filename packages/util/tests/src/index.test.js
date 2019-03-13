import {callWithOneOrMany, mapFromOneOrMany, findFromOneOrMany} from '../../..';

describe('@superstore/util', () => {
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

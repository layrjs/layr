import {callOneOrMany} from '../../..';

describe('@superstore/util', () => {
  test('callOneOrMany()', () => {
    const result = callOneOrMany('aaa', value => value.toUpperCase());
    expect(result).toBe('AAA');

    const results = callOneOrMany(['aaa', 'bbb', 'ccc'], value => value.toUpperCase());
    expect(results).toEqual(['AAA', 'BBB', 'CCC']);
  });
});

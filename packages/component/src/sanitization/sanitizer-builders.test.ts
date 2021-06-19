import {isSanitizerInstance} from './sanitizer';
import {sanitizers} from './sanitizer-builders';

describe('Sanitizer builders', () => {
  test('Building sanitizers', async () => {
    let sanitizer = sanitizers.trim();

    expect(isSanitizerInstance(sanitizer));
    expect(sanitizer.getName()).toBe('trim');
    expect(typeof sanitizer.getFunction()).toBe('function');
    expect(sanitizer.getArguments()).toEqual([]);

    sanitizer = sanitizers.compact();

    expect(isSanitizerInstance(sanitizer));
    expect(sanitizer.getName()).toBe('compact');
    expect(typeof sanitizer.getFunction()).toBe('function');
    expect(sanitizer.getArguments()).toEqual([]);
  });

  test('Running built-in sanitizers', async () => {
    expect(sanitizers.trim().run('hello')).toBe('hello');
    expect(sanitizers.trim().run(' hello ')).toBe('hello');
    expect(sanitizers.trim().run(undefined)).toBe(undefined);

    expect(sanitizers.compact().run(['hello'])).toStrictEqual(['hello']);
    expect(sanitizers.compact().run(['hello', ''])).toStrictEqual(['hello']);
    expect(sanitizers.compact().run([''])).toStrictEqual([]);
    expect(sanitizers.compact().run([])).toStrictEqual([]);
    expect(sanitizers.compact().run(undefined)).toBe(undefined);
  });
});

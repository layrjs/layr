import {Sanitizer, isSanitizerInstance, runSanitizers} from './sanitizer';

runSanitizers;

describe('Sanitizer', () => {
  const trimStart = (value: string) => value.trimStart();

  const trim = (value: string, {start = true, end = true}: {start?: boolean; end?: boolean}) => {
    if (start) {
      value = value.trimStart();
    }

    if (end) {
      value = value.trimEnd();
    }

    return value;
  };

  const upperCaseFirst = (value: string) => value.slice(0, 1).toUpperCase() + value.slice(1);

  test('Creation', async () => {
    let sanitizer = new Sanitizer(trimStart);

    expect(isSanitizerInstance(sanitizer));
    expect(sanitizer.getName()).toBe('trimStart');
    expect(sanitizer.getFunction()).toBe(trimStart);
    expect(sanitizer.getArguments()).toEqual([]);

    sanitizer = new Sanitizer(trim, {arguments: [{end: false}]});

    expect(isSanitizerInstance(sanitizer));
    expect(sanitizer.getName()).toBe('trim');
    expect(sanitizer.getFunction()).toBe(trim);
    expect(sanitizer.getArguments()).toEqual([{end: false}]);
  });

  test('Execution', async () => {
    const trimStartSanitizer = new Sanitizer(trim, {arguments: [{end: false}]});
    const upperCaseFirstSanitizer = new Sanitizer(upperCaseFirst);

    expect(trimStartSanitizer.run('hello')).toBe('hello');
    expect(trimStartSanitizer.run(' hello ')).toBe('hello ');
    expect(upperCaseFirstSanitizer.run('hello')).toBe('Hello');

    expect(runSanitizers([trimStartSanitizer], 'hello')).toBe('hello');
    expect(runSanitizers([trimStartSanitizer], ' hello ')).toBe('hello ');
    expect(runSanitizers([trimStartSanitizer, upperCaseFirstSanitizer], ' hello')).toBe('Hello');
    expect(runSanitizers([upperCaseFirstSanitizer, trimStartSanitizer], ' hello')).toBe('hello');
  });
});

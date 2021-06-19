import {Component} from '../component';
import {Attribute} from '../properties';
import {Sanitizer, isSanitizerInstance} from './sanitizer';
import {sanitizers} from './sanitizer-builders';
import {normalizeSanitizer} from './utilities';

describe('Utilities', () => {
  test('Normalization', async () => {
    class TestComponent extends Component {}

    const attribute = new Attribute('testAttribute', TestComponent.prototype);

    let sanitizer: any = new Sanitizer((value) => value > 0);
    let normalizedSanitizer = normalizeSanitizer(sanitizer, attribute);

    expect(normalizedSanitizer).toBe(sanitizer);

    sanitizer = sanitizers.trim();
    normalizedSanitizer = normalizeSanitizer(sanitizer, attribute);

    expect(normalizedSanitizer).toBe(sanitizer);

    sanitizer = sanitizers.trim;

    expect(() => normalizeSanitizer(sanitizer, attribute)).toThrow(
      "The specified sanitizer is a sanitizer builder that has not been called (attribute: 'TestComponent.prototype.testAttribute')"
    );

    sanitizer = (value: number) => value > 0;
    normalizedSanitizer = normalizeSanitizer(sanitizer, attribute);

    expect(isSanitizerInstance(normalizedSanitizer));
    expect(normalizedSanitizer.getName()).toBe('sanitizer');
    expect(normalizedSanitizer.getFunction()).toBe(sanitizer);
    expect(normalizedSanitizer.getArguments()).toEqual([]);
  });
});

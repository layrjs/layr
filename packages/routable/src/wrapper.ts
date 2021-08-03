import {Addressable, AddressableOptions} from './addressable';
import {Pattern} from './pattern';

export type WrapperOptions = AddressableOptions;

/**
 * Represents a wrapper in a [routable component](https://layrjs.com/docs/v2/reference/routable#routable-component-class).
 *
 * A wrapper is composed of:
 *
 * - A name matching a method of the [routable component](https://layrjs.com/docs/v2/reference/routable#routable-component-class) that contains the wrapper.
 * - The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the wrapper.
 * - Some [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) aliases.
 *
 * #### Usage
 *
 * Typically, you create a `Wrapper` and associate it to a routable component by using the [`@wrapper()`](https://layrjs.com/docs/v2/reference/routable#wrapper-decorator) decorator.
 *
 * See an example of use in the [`Routable()`](https://layrjs.com/docs/v2/reference/routable#usage) mixin.
 */
export class Wrapper extends Addressable {
  constructor(name: string, pattern: Pattern, options: WrapperOptions = {}) {
    super(name, pattern, options);

    if (this.isCatchAll()) {
      throw new Error(`Couldn't create the wrapper '${name}' (cath-all wrappers are not allowed)`);
    }
  }

  static isWrapper(value: any): value is Wrapper {
    return isWrapperInstance(value);
  }
}

/**
 * Returns whether the specified value is a [`Wrapper`](https://layrjs.com/docs/v2/reference/wrapper) class.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isWrapperClass(value: any): value is typeof Wrapper {
  return typeof value?.isWrapper === 'function';
}

/**
 * Returns whether the specified value is a [`Wrapper`](https://layrjs.com/docs/v2/reference/wrapper) instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isWrapperInstance(value: any): value is Wrapper {
  return typeof value?.constructor?.isWrapper === 'function';
}

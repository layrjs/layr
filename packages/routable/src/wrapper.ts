import {Addressable, AddressableOptions} from './addressable';
import {Pattern} from './pattern';

export type WrapperOptions = AddressableOptions;

/**
 * *Inherits from [`Addressable`](https://layrjs.com/docs/v2/reference/addressable).*
 *
 * Represents a wrapper in a [routable component](https://layrjs.com/docs/v2/reference/routable#routable-component-class).
 *
 * #### Usage
 *
 * Typically, you create a `Wrapper` and associate it to a routable component by using the [`@wrapper()`](https://layrjs.com/docs/v2/reference/routable#wrapper-decorator) decorator.
 *
 * See an example of use in the [`BrowserNavigator`](https://layrjs.com/docs/v2/reference/browser-navigator) class.
 */
export class Wrapper extends Addressable {
  // === Creation ===

  /**
   * See the constructor that is inherited from the [`Addressable`](https://layrjs.com/docs/v2/reference/addressable#constructor) class.
   *
   * @category Creation
   */

  constructor(name: string, pattern: Pattern, options: WrapperOptions = {}) {
    super(name, pattern, options);

    if (this.isCatchAll()) {
      throw new Error(`Couldn't create the wrapper '${name}' (catch-all wrappers are not allowed)`);
    }
  }

  // === Methods ===

  /**
   * See the methods that are inherited from the [`Addressable`](https://layrjs.com/docs/v2/reference/addressable#basic-methods) class.
   *
   * @category Methods
   */

  // === Types ===

  /**
   * See the types that are related to the [`Addressable`](https://layrjs.com/docs/v2/reference/addressable#types) class.
   *
   * @category Types
   */

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

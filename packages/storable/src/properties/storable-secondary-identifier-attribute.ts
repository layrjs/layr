import {SecondaryIdentifierAttribute} from '@liaison/component';

// TODO: Find a way to remove this useless import
// I did that to remove a TypeScript error in the generated declaration file
// @ts-ignore
import type {Property, Attribute} from '@liaison/component';

import {StorableAttributeMixin} from './storable-attribute';

/**
 * *Inherits from [`SecondaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/secondary-identifier-attribute) and [`StorableAttribute`](https://liaison.dev/docs/v1/reference/storable-attribute).*
 *
 * The `StorableSecondaryIdentifierAttribute` class is like the [`SecondaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/secondary-identifier-attribute) class but extended with the capabilities of the [`StorableAttribute`](https://liaison.dev/docs/v1/reference/storable-attribute) class.
 *
 * #### Usage
 *
 * Typically, you create a `StorableSecondaryIdentifierAttribute` and associate it to a [storable component](https://liaison.dev/docs/v1/reference/storable#storable-component-class) using the [`@secondaryIdentifier()`](https://liaison.dev/docs/v1/reference/storable#secondary-identifier-decorator) decorator.
 *
 * **Example:**
 *
 * ```
 * // JS
 *
 * import {Component} from '﹫liaison/component';
 * import {Storable, primaryIdentifier, secondaryIdentifier, attribute} from '﹫liaison/storable';
 *
 * class Movie extends Storable(Component) {
 *   ﹫primaryIdentifier() id;
 *
 *   ﹫secondaryIdentifier() slug;
 *
 *   ﹫attribute('string') title = '';
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component} from '﹫liaison/component';
 * import {Storable, primaryIdentifier, secondaryIdentifier, attribute} from '﹫liaison/storable';
 *
 * class Movie extends Storable(Component) {
 *   ﹫primaryIdentifier() id!: string;
 *
 *   ﹫secondaryIdentifier() slug!: string;
 *
 *   ﹫attribute('string') title = '';
 * }
 * ```
 */
export class StorableSecondaryIdentifierAttribute extends StorableAttributeMixin(
  SecondaryIdentifierAttribute
) {
  _storableSecondaryIdentifierAttributeBrand!: void;

  /**
   * @constructor
   *
   * Creates a storable secondary identifier attribute. Typically, instead of using this constructor, you would rather use the [`@secondaryIdentifier()`](https://liaison.dev/docs/v1/reference/storable#secondary-identifier-decorator) decorator.
   *
   * @param name The name of the attribute.
   * @param parent The [storable component](https://liaison.dev/docs/v1/reference/storable#storable-component-class) prototype that owns the attribute.
   * @param [options] An object specifying any option supported by the constructor of [`SecondaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/secondary-identifier-attribute#constructor) and [`StorableAttribute`](https://liaison.dev/docs/v1/reference/storable-attribute#constructor).
   *
   * @returns The [`StorableSecondaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/storable-secondary-identifier-attribute) instance that was created.
   *
   * @category Creation
   */
}

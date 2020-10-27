import {PrimaryIdentifierAttribute} from '@layr/component';

// TODO: Find a way to remove this useless import
// I did that to remove a TypeScript error in the generated declaration file
// @ts-ignore
import type {Property, Attribute} from '@layr/component';

import {StorableAttributeMixin} from './storable-attribute';

/**
 * *Inherits from [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/primary-identifier-attribute) and [`StorableAttribute`](https://layrjs.com/docs/v1/reference/storable-attribute).*
 *
 * The `StorablePrimaryIdentifierAttribute` class is like the [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/primary-identifier-attribute) class but extended with the capabilities of the [`StorableAttribute`](https://layrjs.com/docs/v1/reference/storable-attribute) class.
 *
 * #### Usage
 *
 * Typically, you create a `StorablePrimaryIdentifierAttribute` and associate it to a [storable component](https://layrjs.com/docs/v1/reference/storable#storable-component-class) using the [`@primaryIdentifier()`](https://layrjs.com/docs/v1/reference/storable#primary-identifier-decorator) decorator.
 *
 * **Example:**
 *
 * ```
 * // JS
 *
 * import {Component} from '﹫layr/component';
 * import {Storable, primaryIdentifier, attribute} from '﹫layr/storable';
 *
 * class Movie extends Storable(Component) {
 *   ﹫primaryIdentifier() id;
 *
 *   ﹫attribute('string') title = '';
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component} from '﹫layr/component';
 * import {Storable, primaryIdentifier, attribute} from '﹫layr/storable';
 *
 * class Movie extends Storable(Component) {
 *   ﹫primaryIdentifier() id!: string;
 *
 *   ﹫attribute('string') title = '';
 * }
 * ```
 */
export class StorablePrimaryIdentifierAttribute extends StorableAttributeMixin(
  PrimaryIdentifierAttribute
) {
  _storablePrimaryIdentifierAttributeBrand!: void;

  /**
   * @constructor
   *
   * Creates a storable primary identifier attribute. Typically, instead of using this constructor, you would rather use the [`@primaryIdentifier()`](https://layrjs.com/docs/v1/reference/storable#primary-identifier-decorator) decorator.
   *
   * @param name The name of the attribute.
   * @param parent The [storable component](https://layrjs.com/docs/v1/reference/storable#storable-component-class) prototype that owns the attribute.
   * @param [options] An object specifying any option supported by the constructor of [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/primary-identifier-attribute#constructor) and [`StorableAttribute`](https://layrjs.com/docs/v1/reference/storable-attribute#constructor).
   *
   * @returns The [`StorablePrimaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/storable-primary-identifier-attribute) instance that was created.
   *
   * @category Creation
   */

  // === Property Methods ===

  /**
   * See the methods that are inherited from the [`Property`](https://layrjs.com/docs/v1/reference/property#basic-methods) class.
   *
   * @category Property Methods
   */

  // === Attribute Methods ===

  /**
   * See the methods that are inherited from the [`Attribute`](https://layrjs.com/docs/v1/reference/attribute#value-type) class.
   *
   * @category Attribute Methods
   */
}

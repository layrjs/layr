import {SecondaryIdentifierAttribute} from '@layr/component';

// TODO: Find a way to remove this useless import
// I did that to remove a TypeScript error in the generated declaration file
// @ts-ignore
import type {Property, Attribute} from '@layr/component';

import {StorableAttributeMixin} from './storable-attribute';

/**
 * *Inherits from [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/secondary-identifier-attribute) and [`StorableAttribute`](https://layrjs.com/docs/v1/reference/storable-attribute).*
 *
 * The `StorableSecondaryIdentifierAttribute` class is like the [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/secondary-identifier-attribute) class but extended with the capabilities of the [`StorableAttribute`](https://layrjs.com/docs/v1/reference/storable-attribute) class.
 *
 * #### Usage
 *
 * Typically, you create a `StorableSecondaryIdentifierAttribute` and associate it to a [storable component](https://layrjs.com/docs/v1/reference/storable#storable-component-class) using the [`@secondaryIdentifier()`](https://layrjs.com/docs/v1/reference/storable#secondary-identifier-decorator) decorator.
 *
 * **Example:**
 *
 * ```
 * // JS
 *
 * import {Component} from '﹫layr/component';
 * import {Storable, primaryIdentifier, secondaryIdentifier, attribute} from '﹫layr/storable';
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
 * import {Component} from '﹫layr/component';
 * import {Storable, primaryIdentifier, secondaryIdentifier, attribute} from '﹫layr/storable';
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
   * Creates a storable secondary identifier attribute. Typically, instead of using this constructor, you would rather use the [`@secondaryIdentifier()`](https://layrjs.com/docs/v1/reference/storable#secondary-identifier-decorator) decorator.
   *
   * @param name The name of the attribute.
   * @param parent The [storable component](https://layrjs.com/docs/v1/reference/storable#storable-component-class) prototype that owns the attribute.
   * @param [options] An object specifying any option supported by the constructor of [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/secondary-identifier-attribute#constructor) and [`StorableAttribute`](https://layrjs.com/docs/v1/reference/storable-attribute#constructor).
   *
   * @returns The [`StorableSecondaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/storable-secondary-identifier-attribute) instance that was created.
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

  // === Observability ===

  /**
   * See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class) class.
   *
   * @category Observability
   */
}

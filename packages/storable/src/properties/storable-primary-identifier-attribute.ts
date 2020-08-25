import {PrimaryIdentifierAttribute} from '@liaison/component';

// TODO: Find a way to remove this useless import
// I did that to remove a TypeScript error in the generated declaration file
// @ts-ignore
import type {Property, Attribute} from '@liaison/component';

import {StorableAttributeMixin} from './storable-attribute';

/**
 * *Inherits from [`PrimaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/primary-identifier-attribute) and [`StorableAttribute`](https://liaison.dev/docs/v1/reference/storable-attribute).*
 *
 * The `StorablePrimaryIdentifierAttribute` class is like the [`PrimaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/primary-identifier-attribute) class but extended with the capabilities of the [`StorableAttribute`](https://liaison.dev/docs/v1/reference/storable-attribute) class.
 *
 * #### Usage
 *
 * Typically, you create a `StorablePrimaryIdentifierAttribute` and associate it to a [storable component](https://liaison.dev/docs/v1/reference/storable#storable-component-class) using the [`@primaryIdentifier()`](https://liaison.dev/docs/v1/reference/storable#primary-identifier-decorator) decorator.
 *
 * **Example:**
 *
 * ```
 * // JS
 *
 * import {Component} from '﹫liaison/component';
 * import {Storable, primaryIdentifier, attribute} from '﹫liaison/storable';
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
 * import {Component} from '﹫liaison/component';
 * import {Storable, primaryIdentifier, attribute} from '﹫liaison/storable';
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
}

import type {Component} from '../component';
import type {AttributeOptions} from './attribute';
import {IdentifierAttribute} from './identifier-attribute';

/**
 * *Inherits from [`IdentifierAttribute`](https://liaison.dev/docs/v1/reference/identifier-attribute).*
 *
 * A `SecondaryIdentifierAttribute` is a special kind of attribute that uniquely identify a [Component](https://liaison.dev/docs/v1/reference/component) instance.
 *
 * Contrary to a [`PrimaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/primary-identifier-attribute), you can define more than one `SecondaryIdentifierAttribute` in a `Component`.
 *
 * Another difference with a `PrimaryIdentifierAttribute` is that a `SecondaryIdentifierAttribute` value is mutable (i.e., it can change over time).
 *
 * #### Usage
 *
 * Typically, you create a `SecondaryIdentifierAttribute` and associate it to a component prototype using the [`@secondaryIdentifier()`](https://liaison.dev/docs/v1/reference/component#secondary-identifier-decorator) decorator.
 *
 * A common use case is a `User` component with an immutable primary identifier and a secondary identifier for the email address that can change over time:
 *
 * ```
 * // JS
 *
 * import {Component, primaryIdentifier, secondaryIdentifier} from '﹫liaison/component';
 *
 * class User extends Component {
 *   ﹫primaryIdentifier() id;
 *   ﹫secondaryIdentifier() email;
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component, primaryIdentifier, secondaryIdentifier} from '﹫liaison/component';
 *
 * class User extends Component {
 *   ﹫primaryIdentifier() id!: string;
 *   ﹫secondaryIdentifier() email!: string;
 * }
 * ```
 *
 * To create a `User` instance, you would do something like:
 *
 * ```
 * const user = new User({email: 'someone@domain.tld'});
 *
 * user.id; // => 'ck41vli1z00013h5xx1esffyn'
 * user.email; // => 'someone@domain.tld'
 * ```
 *
 * Note that the primary identifier (`id`) was auto-generated, but we had to provide a value for the secondary identifier (`email`) because secondary identifiers cannot be `undefined` and they are not commonly auto-generated.
 *
 * Like previously mentioned, contrary to a primary identifier, the value of a secondary identifer can be changed:
 *
 * ```
 * user.email = 'someone-else@domain.tld'; // Okay
 * user.id = 'ck2zrb1xs00013g5to1uimigb'; // Error
 * ```
 *
 * `SecondaryIdentifierAttribute` values are usually of type `'string'` (the default), but you can also have values of type `'number'`:
 *
 * ```
 * // JS
 *
 * import {Component, primaryIdentifier, secondaryIdentifier} from '﹫liaison/component';
 *
 * class User extends Component {
 *   ﹫primaryIdentifier() id;
 *   ﹫secondaryIdentifier('number') reference;
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component, primaryIdentifier, secondaryIdentifier} from '﹫liaison/component';
 *
 * class User extends Component {
 *   ﹫primaryIdentifier() id!: string;
 *   ﹫secondaryIdentifier('number') reference!: number;
 * }
 * ```
 */
export class SecondaryIdentifierAttribute extends IdentifierAttribute {
  _secondaryIdentifierAttributeBrand!: void;

  /**
   * Creates an instance of [`SecondaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/secondary-identifier-attribute). Typically, instead of using this constructor, you would rather use the [`@secondaryIdentifier()`](https://liaison.dev/docs/v1/reference/component#secondary-identifier-decorator) decorator.
   *
   * @param name The name of the attribute.
   * @param parent The component prototype that owns the attribute.
   * @param [options.valueType] A string specifying the type of values the attribute can store. It can be either `'string'` or `'number'` (default: `'string'`).
   * @param [options.default] A function returning the default value of the attribute.
   * @param [options.validators] An array of [validators](https://liaison.dev/docs/v1/reference/validator) for the value of the attribute.
   * @param [options.exposure] A [`PropertyExposure`](https://liaison.dev/docs/v1/reference/property#property-exposure-type) object specifying how the attribute should be exposed to remote access.
   *
   * @returns The [`SecondaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/secondary-identifier-attribute) instance that was created.
   *
   * @example
   * ```
   * import {Component, SecondaryIdentifierAttribute} from '﹫liaison/component';
   *
   * class User extends Component {}
   *
   * const email = new SecondaryIdentifierAttribute('email', User.prototype);
   *
   * email.getName(); // => 'email'
   * email.getParent(); // => User.prototype
   * email.getValueType().toString(); // => 'string'
   * ```
   *
   * @category Creation
   */
  constructor(name: string, parent: Component, options: AttributeOptions = {}) {
    super(name, parent, options);
  }

  // === Property Methods ===

  /**
   * See the methods that are inherited from the [`Property`](https://liaison.dev/docs/v1/reference/property#basic-methods) class.
   *
   * @category Property Methods
   */

  // === Attribute Methods ===

  /**
   * See the methods that are inherited from the [`Attribute`](https://liaison.dev/docs/v1/reference/attribute#value-type) class.
   *
   * @category Attribute Methods
   */

  // === Observability ===

  /**
   * See the methods that are inherited from the [`Observable`](https://liaison.dev/docs/v1/reference/observable#observable-class) class.
   *
   * @category Observability
   */

  // === Utilities ===

  static isSecondaryIdentifierAttribute(value: any): value is SecondaryIdentifierAttribute {
    return isSecondaryIdentifierAttributeInstance(value);
  }
}

/**
 * Returns whether the specified value is a `SecondaryIdentifierAttribute` class.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isSecondaryIdentifierAttributeClass(
  value: any
): value is typeof SecondaryIdentifierAttribute {
  return typeof value?.isSecondaryIdentifierAttribute === 'function';
}

/**
 * Returns whether the specified value is a `SecondaryIdentifierAttribute` instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isSecondaryIdentifierAttributeInstance(
  value: any
): value is SecondaryIdentifierAttribute {
  return isSecondaryIdentifierAttributeClass(value?.constructor) === true;
}

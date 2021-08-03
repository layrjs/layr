### SecondaryIdentifierAttribute <badge type="primary">class</badge> {#secondary-identifier-attribute-class}

*Inherits from [`IdentifierAttribute`](https://layrjs.com/docs/v2/reference/identifier-attribute).*

A `SecondaryIdentifierAttribute` is a special kind of attribute that uniquely identify a [Component](https://layrjs.com/docs/v2/reference/component) instance.

Contrary to a [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute), you can define more than one `SecondaryIdentifierAttribute` in a `Component`.

Another difference with a `PrimaryIdentifierAttribute` is that a `SecondaryIdentifierAttribute` value is mutable (i.e., it can change over time).

#### Usage

Typically, you create a `SecondaryIdentifierAttribute` and associate it to a component prototype using the [`@secondaryIdentifier()`](https://layrjs.com/docs/v2/reference/component#secondary-identifier-decorator) decorator.

A common use case is a `User` component with an immutable primary identifier and a secondary identifier for the email address that can change over time:

```
// JS

import {Component, primaryIdentifier, secondaryIdentifier} from '@layr/component';

class User extends Component {
  @primaryIdentifier() id;
  @secondaryIdentifier() email;
}
```

```
// TS

import {Component, primaryIdentifier, secondaryIdentifier} from '@layr/component';

class User extends Component {
  @primaryIdentifier() id!: string;
  @secondaryIdentifier() email!: string;
}
```

To create a `User` instance, you would do something like:

```
const user = new User({email: 'someone@domain.tld'});

user.id; // => 'ck41vli1z00013h5xx1esffyn'
user.email; // => 'someone@domain.tld'
```

Note that the primary identifier (`id`) was auto-generated, but we had to provide a value for the secondary identifier (`email`) because secondary identifiers cannot be `undefined` and they are not commonly auto-generated.

Like previously mentioned, contrary to a primary identifier, the value of a secondary identifer can be changed:

```
user.email = 'someone-else@domain.tld'; // Okay
user.id = 'ck2zrb1xs00013g5to1uimigb'; // Error
```

`SecondaryIdentifierAttribute` values are usually of type `'string'` (the default), but you can also have values of type `'number'`:

```
// JS

import {Component, primaryIdentifier, secondaryIdentifier} from '@layr/component';

class User extends Component {
  @primaryIdentifier() id;
  @secondaryIdentifier('number') reference;
}
```

```
// TS

import {Component, primaryIdentifier, secondaryIdentifier} from '@layr/component';

class User extends Component {
  @primaryIdentifier() id!: string;
  @secondaryIdentifier('number') reference!: number;
}
```

#### Creation

##### `new SecondaryIdentifierAttribute(name, parent, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates an instance of [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute). Typically, instead of using this constructor, you would rather use the [`@secondaryIdentifier()`](https://layrjs.com/docs/v2/reference/component#secondary-identifier-decorator) decorator.

**Parameters:**

* `name`: The name of the attribute.
* `parent`: The component prototype that owns the attribute.
* `options`:
  * `valueType`: A string specifying the type of values the attribute can store. It can be either `'string'` or `'number'` (default: `'string'`).
  * `default`: A function returning the default value of the attribute.
  * `validators`: An array of [validators](https://layrjs.com/docs/v2/reference/validator) for the value of the attribute.
  * `exposure`: A [`PropertyExposure`](https://layrjs.com/docs/v2/reference/property#property-exposure-type) object specifying how the attribute should be exposed to remote access.

**Returns:**

The [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute) instance that was created.

**Example:**

```
import {Component, SecondaryIdentifierAttribute} from '@layr/component';

class User extends Component {}

const email = new SecondaryIdentifierAttribute('email', User.prototype);

email.getName(); // => 'email'
email.getParent(); // => User.prototype
email.getValueType().toString(); // => 'string'
```

#### Property Methods

See the methods that are inherited from the [`Property`](https://layrjs.com/docs/v2/reference/property#basic-methods) class.

#### Attribute Methods

See the methods that are inherited from the [`Attribute`](https://layrjs.com/docs/v2/reference/attribute#value-type) class.

#### Observability

See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v2/reference/observable#observable-class) class.

#### Utilities

##### `isSecondaryIdentifierAttributeClass(value)` <badge type="tertiary-outline">function</badge> {#is-secondary-identifier-attribute-class-function}

Returns whether the specified value is a `SecondaryIdentifierAttribute` class.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `isSecondaryIdentifierAttributeInstance(value)` <badge type="tertiary-outline">function</badge> {#is-secondary-identifier-attribute-instance-function}

Returns whether the specified value is a `SecondaryIdentifierAttribute` instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

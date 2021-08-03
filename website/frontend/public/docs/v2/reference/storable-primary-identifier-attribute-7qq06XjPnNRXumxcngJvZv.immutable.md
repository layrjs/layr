### StorablePrimaryIdentifierAttribute <badge type="primary">class</badge> {#storable-primary-identifier-attribute-class}

*Inherits from [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute) and [`StorableAttribute`](https://layrjs.com/docs/v2/reference/storable-attribute).*

The `StorablePrimaryIdentifierAttribute` class is like the [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute) class but extended with the capabilities of the [`StorableAttribute`](https://layrjs.com/docs/v2/reference/storable-attribute) class.

#### Usage

Typically, you create a `StorablePrimaryIdentifierAttribute` and associate it to a [storable component](https://layrjs.com/docs/v2/reference/storable#storable-component-class) using the [`@primaryIdentifier()`](https://layrjs.com/docs/v2/reference/storable#primary-identifier-decorator) decorator.

**Example:**

```
// JS

import {Component} from '@layr/component';
import {Storable, primaryIdentifier, attribute} from '@layr/storable';

class Movie extends Storable(Component) {
  @primaryIdentifier() id;

  @attribute('string') title = '';
}
```

```
// TS

import {Component} from '@layr/component';
import {Storable, primaryIdentifier, attribute} from '@layr/storable';

class Movie extends Storable(Component) {
  @primaryIdentifier() id!: string;

  @attribute('string') title = '';
}
```

#### Creation

##### `new StorablePrimaryIdentifierAttribute(name, parent, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates a storable primary identifier attribute. Typically, instead of using this constructor, you would rather use the [`@primaryIdentifier()`](https://layrjs.com/docs/v2/reference/storable#primary-identifier-decorator) decorator.

**Parameters:**

* `name`: The name of the attribute.
* `parent`: The [storable component](https://layrjs.com/docs/v2/reference/storable#storable-component-class) prototype that owns the attribute.
* `options`: An object specifying any option supported by the constructor of [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute#constructor) and [`StorableAttribute`](https://layrjs.com/docs/v2/reference/storable-attribute#constructor).

**Returns:**

The [`StorablePrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/storable-primary-identifier-attribute) instance that was created.

#### Property Methods

See the methods that are inherited from the [`Property`](https://layrjs.com/docs/v2/reference/property#basic-methods) class.

#### Attribute Methods

See the methods that are inherited from the [`Attribute`](https://layrjs.com/docs/v2/reference/attribute#value-type) class.

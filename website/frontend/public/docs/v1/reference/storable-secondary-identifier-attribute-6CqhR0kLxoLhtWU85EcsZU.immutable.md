### StorableSecondaryIdentifierAttribute <badge type="primary">class</badge> {#storable-secondary-identifier-attribute-class}

*Inherits from [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/secondary-identifier-attribute) and [`StorableAttribute`](https://layrjs.com/docs/v1/reference/storable-attribute).*

The `StorableSecondaryIdentifierAttribute` class is like the [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/secondary-identifier-attribute) class but extended with the capabilities of the [`StorableAttribute`](https://layrjs.com/docs/v1/reference/storable-attribute) class.

#### Usage

Typically, you create a `StorableSecondaryIdentifierAttribute` and associate it to a [storable component](https://layrjs.com/docs/v1/reference/storable#storable-component-class) using the [`@secondaryIdentifier()`](https://layrjs.com/docs/v1/reference/storable#secondary-identifier-decorator) decorator.

**Example:**

```
// JS

import {Component} from '@layr/component';
import {Storable, primaryIdentifier, secondaryIdentifier, attribute} from '@layr/storable';

class Movie extends Storable(Component) {
  @primaryIdentifier() id;

  @secondaryIdentifier() slug;

  @attribute('string') title = '';
}
```

```
// TS

import {Component} from '@layr/component';
import {Storable, primaryIdentifier, secondaryIdentifier, attribute} from '@layr/storable';

class Movie extends Storable(Component) {
  @primaryIdentifier() id!: string;

  @secondaryIdentifier() slug!: string;

  @attribute('string') title = '';
}
```

#### Creation

##### `new StorableSecondaryIdentifierAttribute(name, parent, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates a storable secondary identifier attribute. Typically, instead of using this constructor, you would rather use the [`@secondaryIdentifier()`](https://layrjs.com/docs/v1/reference/storable#secondary-identifier-decorator) decorator.

**Parameters:**

* `name`: The name of the attribute.
* `parent`: The [storable component](https://layrjs.com/docs/v1/reference/storable#storable-component-class) prototype that owns the attribute.
* `options`: An object specifying any option supported by the constructor of [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/secondary-identifier-attribute#constructor) and [`StorableAttribute`](https://layrjs.com/docs/v1/reference/storable-attribute#constructor).

**Returns:**

The [`StorableSecondaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/storable-secondary-identifier-attribute) instance that was created.

#### Property Methods

See the methods that are inherited from the [`Property`](https://layrjs.com/docs/v1/reference/property#basic-methods) class.

#### Attribute Methods

See the methods that are inherited from the [`Attribute`](https://layrjs.com/docs/v1/reference/attribute#value-type) class.

#### Observability

See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class) class.

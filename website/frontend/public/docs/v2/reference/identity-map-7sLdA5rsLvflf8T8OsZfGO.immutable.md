### IdentityMap <badge type="primary">class</badge> {#identity-map-class}

A class to manage the instances of the [`Component`](https://layrjs.com/docs/v2/reference/component) classes that are identifiable.

A component class is identifiable when its prototype has a [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute).

When a component class is identifiable, the `IdentityMap` ensures that there can only be one component instance with a specific identifier. So if you try to create two components with the same identifier, you will get an error.

#### Usage

You shouldn't have to create an `IdentityMap` by yourself. Identity maps are created automatically for each [`Component`](https://layrjs.com/docs/v2/reference/component) class that are identifiable.

**Example:**

Here is a `Movie` component with an `id` primary identifier attribute:

```
// JS

import {Component, primaryIdentifier, attribute} from '@layr/component';

class Movie extends Component {
  @primaryIdentifier() id;
  @attribute('string') title;
}
```

```
// TS

import {Component, primaryIdentifier, attribute} from '@layr/component';

class Movie extends Component {
  @primaryIdentifier() id!: string;
  @attribute('string') title!: string;
}
```

To get the `IdentityMap` of the `Movie` component, simply do:

```
const identityMap = Movie.getIdentityMap();
```

Currently, the `IdentifyMap` provides only one public method — [`getComponent()`](https://layrjs.com/docs/v2/reference/identity-map#get-component-instance-method) — that allows to retrieve a component instance from its identifier:

```
const movie = new Movie({id: 'abc123', title: 'Inception'});

identityMap.getComponent('abc123'); // => movie
```

#### Methods

##### `getComponent(identifiers)` <badge type="secondary-outline">instance method</badge> {#get-component-instance-method}

Gets a component instance from one of its identifiers. If there are no components corresponding to the specified identifiers, returns `undefined`.

**Parameters:**

* `identifiers`: A plain object specifying some identifiers. The shape of the object should be `{[identifierName]: identifierValue}`. Alternatively, you can specify a string or a number representing the value of the [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute) of the component you want to get.

**Returns:**

A [`Component`](https://layrjs.com/docs/v2/reference/component) instance or `undefined`.

**Example:**

```
// JS

import {Component, primaryIdentifier, secondaryIdentifier} from '@layr/component';

class Movie extends Component {
  @primaryIdentifier() id;
  @secondaryIdentifier() slug;
}

const movie = new Movie({id: 'abc123', slug: 'inception'});

Movie.getIdentityMap().getComponent('abc123'); // => movie
Movie.getIdentityMap().getComponent({id: 'abc123'}); // => movie
Movie.getIdentityMap().getComponent({slug: 'inception'}); // => movie
Movie.getIdentityMap().getComponent('xyx456'); // => undefined
```
```
// TS

import {Component, primaryIdentifier, secondaryIdentifier} from '@layr/component';

class Movie extends Component {
  @primaryIdentifier() id!: string;
  @secondaryIdentifier() slug!: string;
}

const movie = new Movie({id: 'abc123', slug: 'inception'});

Movie.getIdentityMap().getComponent('abc123'); // => movie
Movie.getIdentityMap().getComponent({id: 'abc123'}); // => movie
Movie.getIdentityMap().getComponent({slug: 'inception'}); // => movie
Movie.getIdentityMap().getComponent('xyx456'); // => undefined
```

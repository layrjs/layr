### AttributeSelector <badge type="primary-outline">type</badge> {#attribute-selector-type}

An `AttributeSelector` allows you to select some attributes of a component.

The simplest `AttributeSelector` is `true`, which means that all the attributes are selected.

Another possible `AttributeSelector` is `false`, which means that no attributes are selected.

To select some specific attributes, you can use a plain object where:

* The keys are the name of the attributes you want to select.
* The values are a boolean or a nested object to select some attributes of a nested component.

**Examples:**

```
// Selects all the attributes
true

// Excludes all the attributes
false

// Selects `title`
{title: true}

// Selects also `title` (`summary` is not selected)
{title: true, summary: false}

// Selects `title` and `summary`
{title: true, summary: true}

// Selects `title`, `movieDetails.duration`, and `movieDetails.aspectRatio`
{
  title: true,
  movieDetails: {
    duration: true,
    aspectRatio: true
  }
}
```

#### Functions

##### `createAttributeSelectorFromNames(names)` <badge type="tertiary-outline">function</badge> {#create-attribute-selector-from-names-function}

Creates an `AttributeSelector` from the specified names.

**Parameters:**

* `names`: An array of strings.

**Returns:**

An `AttributeSelector`.

**Example:**

```
createAttributeSelectorFromNames(['title', 'summary']);
// => {title: true, summary: true}
```

##### `createAttributeSelectorFromAttributes(attributes)` <badge type="tertiary-outline">function</badge> {#create-attribute-selector-from-attributes-function}

Creates an `AttributeSelector` from an attribute iterator.

**Parameters:**

* `attributes`: An [`Attribute`](https://layrjs.com/docs/v1/reference/attribute) iterator.

**Returns:**

An `AttributeSelector`.

**Example:**

```
createAttributeSelectorFromAttributes(Movie.prototype.getAttributes());
// => {title: true, summary: true, movieDetails: true}
```

##### `getFromAttributeSelector(attributeSelector, name)` <badge type="tertiary-outline">function</badge> {#get-from-attribute-selector-function}

Gets an entry of an `AttributeSelector`.

**Parameters:**

* `attributeSelector`: An `AttributeSelector`.
* `name`: The name of the entry to get.

**Returns:**

An `AttributeSelector`.

**Example:**

```
getFromAttributeSelector(true, 'title');
// => true

getFromAttributeSelector(false, 'title');
// => false

getFromAttributeSelector({title: true}, 'title');
// => true

getFromAttributeSelector({title: true}, 'summary');
// => false

getFromAttributeSelector({movieDetails: {duration: true}}, 'movieDetails');
// => {duration: true}
```

##### `setWithinAttributeSelector(attributeSelector, name, subattributeSelector)` <badge type="tertiary-outline">function</badge> {#set-within-attribute-selector-function}

Returns an `AttributeSelector` where an entry of the specified `AttributeSelector` is set with another `AttributeSelector`.

**Parameters:**

* `attributeSelector`: An `AttributeSelector`.
* `name`: The name of the entry to set.
* `subattributeSelector`: Another `AttributeSelector`.

**Returns:**

A new `AttributeSelector`.

**Example:**

```
setWithinAttributeSelector({title: true}, 'summary', true);
// => {title: true, summary: true}

setWithinAttributeSelector({title: true}, 'summary', false);
// => {title: true}

setWithinAttributeSelector({title: true, summary: true}, 'summary', false);
// => {title: true}

setWithinAttributeSelector({title: true}, 'movieDetails', {duration: true});
// => {title: true, movieDetails: {duration: true}}
```

##### `cloneAttributeSelector(attributeSelector)` <badge type="tertiary-outline">function</badge> {#clone-attribute-selector-function}

Clones an `AttributeSelector`.

**Parameters:**

* `attributeSelector`: An `AttributeSelector`.

**Returns:**

A new `AttributeSelector`.

**Example:**

```
cloneAttributeSelector(true);
// => true

cloneAttributeSelector(false);
// => false

cloneAttributeSelector({title: true, movieDetails: {duration: true});
// => {title: true, movieDetails: {duration: true}
```

##### `attributeSelectorsAreEqual(attributeSelector, otherAttributeSelector)` <badge type="tertiary-outline">function</badge> {#attribute-selectors-are-equal-function}

Returns whether an `AttributeSelector` is equal to another `AttributeSelector`.

**Parameters:**

* `attributeSelector`: An `AttributeSelector`.
* `otherAttributeSelector`: Another `AttributeSelector`.

**Returns:**

A boolean.

**Example:**

```
attributeSelectorsAreEqual({title: true}, {title: true});
// => true

attributeSelectorsAreEqual({title: true, summary: false}, {title: true});
// => true

attributeSelectorsAreEqual({title: true}, {summary: true});
// => false
```

##### `attributeSelectorIncludes(attributeSelector, otherAttributeSelector)` <badge type="tertiary-outline">function</badge> {#attribute-selector-includes-function}

Returns whether an `AttributeSelector` includes another `AttributeSelector`.

**Parameters:**

* `attributeSelector`: An `AttributeSelector`.
* `otherAttributeSelector`: Another `AttributeSelector`.

**Returns:**

A boolean.

**Example:**

```
attributeSelectorIncludes({title: true}, {title: true});
// => true

attributeSelectorIncludes({title: true, summary: true}, {title: true});
// => true

attributeSelectorIncludes({title: true}, {summary: true});
// => false
```

##### `mergeAttributeSelectors(attributeSelector, otherAttributeSelector)` <badge type="tertiary-outline">function</badge> {#merge-attribute-selectors-function}

Returns an `AttributeSelector` which is the result of merging an `AttributeSelector` with another `AttributeSelector`.

**Parameters:**

* `attributeSelector`: An `AttributeSelector`.
* `otherAttributeSelector`: Another `AttributeSelector`.

**Returns:**

A new `AttributeSelector`.

**Example:**

```
mergeAttributeSelectors({title: true}, {title: true});
// => {title: true}

mergeAttributeSelectors({title: true}, {summary: true});
// => {title: true, summary: true}

mergeAttributeSelectors({title: true, summary: true}, {summary: false});
// => {title: true}
```

##### `intersectAttributeSelectors(attributeSelector, otherAttributeSelector)` <badge type="tertiary-outline">function</badge> {#intersect-attribute-selectors-function}

Returns an `AttributeSelector` which is the result of the intersection of an `AttributeSelector` with another `AttributeSelector`.

**Parameters:**

* `attributeSelector`: An `AttributeSelector`.
* `otherAttributeSelector`: Another `AttributeSelector`.

**Returns:**

A new `AttributeSelector`.

**Example:**

```
intersectAttributeSelectors({title: true, summary: true}, {title: true});
// => {title: true}

intersectAttributeSelectors({title: true}, {summary: true});
// => {}
```

##### `removeFromAttributeSelector(attributeSelector, otherAttributeSelector)` <badge type="tertiary-outline">function</badge> {#remove-from-attribute-selector-function}

Returns an `AttributeSelector` which is the result of removing an `AttributeSelector` from another `AttributeSelector`.

**Parameters:**

* `attributeSelector`: An `AttributeSelector`.
* `otherAttributeSelector`: Another `AttributeSelector`.

**Returns:**

A new `AttributeSelector`.

**Example:**

```
removeFromAttributeSelector({title: true, summary: true}, {summary: true});
// => {title: true}

removeFromAttributeSelector({title: true}, {title: true});
// => {}
```

### Query <badge type="primary-outline">type</badge> {#query-type}

A plain object specifying the criteria to be used when selecting some components from a store with the methods [`StorableComponent.find()`](https://layrjs.com/docs/v2/reference/storable#find-class-method) or [`StorableComponent.count()`](https://layrjs.com/docs/v2/reference/storable#count-class-method).

#### Basic Queries

##### Empty Query

Specify an empty object (`{}`) to select all the components:

```
// Find all the movies
await Movie.find({});
```

##### Single Attribute Query

Specify an object composed of an attribute's name and value to select the components that have an attribute's value equals to a specific value:

```
// Find the Japanese movies
await Movie.find({country: 'Japan'});

// Find the unreleased movies
await Movie.find({year: undefined});
```

##### Multiple Attributes Query

You can combine several attributes' name and value to select the components by multiple attributes:

```
// Find the Japanese drama movies
await Movie.find({country: 'Japan', genre: 'drama'});
```

#### Basic Operators

Instead of a specific value, you can specify an object containing one or more operators to check whether the value of an attribute matches certain criteria.

##### `$equal`

Use the `$equal` operator to check whether the value of an attribute is equal to a specific value. This is the default operator, so when you specify a value without any operator, the `$equal` operator is used under the hood:

```
// Find the Japanese movies
await Movie.find({country: {$equal: 'Japan'}});

// Same as above, but in a short manner
await Movie.find({country: 'Japan'});
```

##### `$notEqual`

Use the `$notEqual` operator to check whether the value of an attribute is different than a specific value:

```
// Find the non-Japanese movies
await Movie.find({country: {$notEqual: 'Japan'}});

// Find the released movies
await Movie.find({year: {$notEqual: undefined}});
```

##### `$greaterThan`

Use the `$greaterThan` operator to check whether the value of an attribute is greater than a specific value:

```
// Find the movies released after 2010
await Movie.find({year: {$greaterThan: 2010}});
```

##### `$greaterThanOrEqual`

Use the `$greaterThanOrEqual` operator to check whether the value of an attribute is greater than or equal to a specific value:

```
// Find the movies released in or after 2010
await Movie.find({year: {$greaterThanOrEqual: 2010}});
```

##### `$lessThan`

Use the `$lessThan` operator to check whether the value of an attribute is less than a specific value:

```
// Find the movies released before 2010
await Movie.find({year: {$lessThan: 2010}});
```

##### `$lessThanOrEqual`

Use the `$lessThanOrEqual` operator to check whether the value of an attribute is less than or equal to a specific value:

```
// Find the movies released in or before 2010
await Movie.find({year: {$lessThanOrEqual: 2010}});
```

##### `$in`

Use the `$in` operator to check whether the value of an attribute is equal to any value in the specified array:

```
// Find the movies that are Japanese or French
await Movie.find({country: {$in: ['Japan', 'France']}});

// Find the movies that have any of the specified identifiers
await Movie.find({id: {$in: ['abc123', 'abc456', 'abc789']}});
```

##### Combining several operators

You can combine several operators to check whether the value of an attribute matches several criteria:

```
// Find the movies released after 2010 and before 2015
await Movie.find({year: {$greaterThan: 2010, $lessThan: 2015}});
```

#### String Operators

A number of operators are dedicated to string attributes.

##### `$includes`

Use the `$includes` operator to check whether the value of a string attribute includes a specific string:

```
// Find the movies that have the string 'awesome' in their title
await Movie.find({title: {$includes: 'awesome'}});
```

##### `$startsWith`

Use the `$startsWith` operator to check whether the value of a string attribute starts with a specific string:

```
// Find the movies that have their title starting with the string 'awesome'
await Movie.find({title: {$startsWith: 'awesome'}});
```

##### `$endsWith`

Use the `$endsWith` operator to check whether the value of a string attribute ends with a specific string:

```
// Find the movies that have their title ending with the string 'awesome'
await Movie.find({title: {$endsWith: 'awesome'}});
```

##### `$matches`

Use the `$matches` operator to check whether the value of a string attribute matches the specified [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions):

```
// Find the movies that have a number in their title
await Movie.find({title: {$matches: /\d/}});
```

#### Array Operators

A number of operators are dedicated to array attributes.

##### `$some`

Use the `$some` operator to check whether an array attribute has an item equals to a specific value. This is the default operator for array attributes, so when you specify a value without any array operator, the `$some` operator is used under the hood:

```
// Find the movies that have the 'awesome' tag
await Movie.find({tags: {$some: 'awesome'}});

// Same as above, but in a short manner
await Movie.find({tags: 'awesome'});
```

##### `$every`

Use the `$every` operator to check whether an array attribute has all its items equals to a specific value:

```
// Find the movies that have all their tags equal to 'awesome'
await Movie.find({tags: {$every: 'awesome'}});
```

##### `$length`

Use the `$length` operator to check whether an array attribute has a specific number of items:

```
// Find the movies that have three tags:
await Movie.find({tags: {$length: 3}});

// Find the movies that don't have any tag:
await Movie.find({tags: {$length: 0}});
```

#### Logical Operators

The logical operators allows you to combine several subqueries.

##### `$and`

Use the `$and` operator to perform a logical **AND** operation on an array of subqueries and select the components that satisfy *all* the subqueries. Note that since **AND** is the implicit logical operation when you combine multiple attributes or operators, you will typically use the `$and` operator in combination with some other logical operators such as [`$or`](https://layrjs.com/docs/v2/reference/query#or) to avoid repetition.

```
// Find the Japanese drama movies
await Movie.find({$and: [{country: 'Japan'}, {genre: 'drama'}]});

// Same as above, but in a short manner
await Movie.find({country: 'Japan', genre: 'drama'});

// Find the movies released after 2010 and before 2015
await Movie.find({$and: [{year: {$greaterThan: 2010}}, {year: {$lessThan: 2015}}]});

// Same as above, but in a short manner
await Movie.find({year: {$greaterThan: 2010, $lessThan: 2015}});

// Find the Japanese movies released before 2010 or after 2015
await Movie.find({
  $and: [
    {country: 'Japan'},
    {$or: [{year: {$lessThan: 2010}}, {year: {$greaterThan: 2015}}]}
  ]
});

// Same as above, but we have to repeat the country to remove the $and operator
await Movie.find({
  $or: [
    {country: 'Japan', year: {$lessThan: 2010}},
    {country: 'Japan', year: {$greaterThan: 2015}}
  ]
});
```

##### `$or`

Use the `$or` operator to perform a logical **OR** operation on an array of subqueries and select the components that satisfy *at least* one of the subqueries.

```
// Find the movies that are either Japanese or a drama
await Movie.find({$or: [{country: 'Japan', {genre: 'drama'}]});

// Find the movies released before 2010 or after 2015
await Movie.find({$or: [{year: {$lessThan: 2010}}, {year: {$greaterThan: 2015}}]});
```

##### `$nor`

Use the `$nor` operator to perform a logical **NOR** operation on an array of subqueries and select the components that *fail all* the subqueries.

```
// Find the movies that are not Japanese and not a drama
await Movie.find({$nor: [{country: 'Japan', {genre: 'drama'}]});
```

##### `$not`

Use the `$not` operator to invert the effect of an operator.

```
// Find the non-Japanese movies
await Movie.find({country: {$not: {$equal: 'Japan'}}});

// Same as above, but in a short manner
await Movie.find({country: {$notEqual: 'Japan'}});

// Find the movies that was not released in or after 2010
await Movie.find({year: {$not: {$greaterThanOrEqual: 2010}}});

// Same as above, but in a short manner
await Movie.find({year: {$lessThan: 2010}});
```

#### Embedded Components

When a query involves an [embedded component](https://layrjs.com/docs/v2/reference/embedded-component), wrap the attributes of the embedded component in an object:

```
// Find the movies that have a '16:9' aspect ratio
await Movie.find({details: {aspectRatio: '16:9'}});

// Find the movies that have a '16:9' aspect ratio and are longer than 2 hours
await Movie.find({details: {aspectRatio: '16:9', duration: {$greaterThan: 120}}});
```

#### Referenced Components

To check whether a component holds a [reference to another component](https://layrjs.com/docs/v2/reference/component#referencing-components), you can specify an object representing the [primary identifier](https://layrjs.com/docs/v2/reference/primary-identifier-attribute) of the referenced component:

```
// Find the Tarantino's movies
const tarantino = await Director.get({slug: 'quentin-tarantino'});
await Movie.find({director: {id: tarantino.id}});
```

Wherever you can specify a primary identifier, you can specify a component instead. So, the example above can be shortened as follows:

```
// Find the Tarantino's movies in a short manner
const tarantino = await Director.get({slug: 'quentin-tarantino'});
await Movie.find({director: tarantino});
```

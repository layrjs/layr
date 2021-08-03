### Sanitizer <badge type="primary">class</badge> {#sanitizer-class}

A class to handle the sanitization of the component attributes.

#### Usage

You shouldn't have to create a `Sanitizer` instance directly. Instead, when you define an attribute (using a decorator such as [`@attribute()`](https://layrjs.com/docs/v2/reference/component#attribute-decorator)), you can invoke some [built-in sanitizer builders](https://layrjs.com/docs/v2/reference/sanitizer#built-in-sanitizer-builders) or specify your own [custom sanitization functions](https://layrjs.com/docs/v2/reference/sanitizer#custom-sanitization-functions) that will be automatically transformed into `Sanitizer` instances.

**Example:**

```
// JS

import {Component, attribute, sanitizers} from '@layr/component';

const {trim, compact} = sanitizers;

class Movie extends Component {
  // An attribute of type 'string' that is automatically trimmed
  @attribute('string', {sanitizers: [trim()]}) title;

  // An array attribute for storing non-empty strings
  @attribute('string[]', {sanitizers: [compact()], items: {sanitizers: [trim()]}})
  tags = [];
}
```

```
// TS

import {Component, attribute, sanitizers} from '@layr/component';

const {trim, compact} = sanitizers;

class Movie extends Component {
  // An attribute of type 'string' that is automatically trimmed
  @attribute('string', {sanitizers: [trim()]}) title!: string;

  // An array attribute for storing non-empty strings
  @attribute('string[]', {sanitizers: [compact()], items: {sanitizers: [trim()]}})
  tags: string[] = [];
}
```

In case you want to access the `Sanitizer` instances that were created under the hood, you can do the following:

```
const movie = new Movie({ ... });

movie.getAttribute('title').getValueType().getSanitizers();
// => [trimSanitizer]

movie.getAttribute('tags').getValueType().getSanitizers();
// => [compactSanitizer]

movie.getAttribute('tags').getValueType().getItemType().getSanitizers();
// => [trimSanitizer]
```

#### Built-In Sanitizer Builders

Layr provides some sanitizer builders that can be used when you define your component attributes. See an [example of use](https://layrjs.com/docs/v2/reference/sanitizer#usage) above.

##### Strings

The following sanitizer builder can be used to sanitize strings:

* `trim()`: Removes leading and trailing whitespace from the string.

##### Arrays

The following sanitizer builder can be used to sanitize arrays:

* `compact()`: Removes all falsey values from the array. The values `false`, `null`, `0`, `''`, `undefined`, and `NaN` are falsey.

#### Custom Sanitization Functions

In addition to the [built-in sanitizer builders](https://layrjs.com/docs/v2/reference/sanitizer#built-in-sanitizer-builders), you can sanitize your component attributes with your own custom sanitization functions.

A custom sanitization function takes a value as first parameter and returns a new value that is the result of the sanitization.

**Example:**

```
// JS

import {Component, attribute} from '@layr/component';

class Integer extends Component {
  // Ensures that the value is an integer
  @attribute('number', {sanitizers: [(value) => Math.round(value)]}) value;
}
```

```
// TS

import {Component, attribute} from '@layr/component';

class Integer extends Component {
  // Ensures that the value is an integer
  @attribute('number', {sanitizers: [(value) => Math.round(value)]}) value!: number;
}
```

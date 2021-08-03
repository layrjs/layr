### StorableMethod <badge type="primary">class</badge> {#storable-method-class}

*Inherits from [`Method`](https://layrjs.com/docs/v2/reference/method) and [`StorableProperty`](https://layrjs.com/docs/v2/reference/storable-property).*

The `StorableMethod` class extends the [`Method`](https://layrjs.com/docs/v2/reference/method) class with the capabilities of the [`StorableProperty`](https://layrjs.com/docs/v2/reference/storable-property) class.

In a nutshell, using the `StorableMethod` class allows you to associate a [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type) to a method so this method can be used in a [`Query`](https://layrjs.com/docs/v2/reference/query).


#### Usage

Typically, you create a `StorableMethod` and associate it to a [storable component](https://layrjs.com/docs/v2/reference/storable#storable-component-class) using the [`@method()`](https://layrjs.com/docs/v2/reference/storable#method-decorator) decorator.

For example, here is how you would define a `Movie` component with some storable attributes and methods:

```
// JS

import {Component} from '@layr/component';
import {Storable, primaryIdentifier, attribute, method} from '@layr/storable';

class Movie extends Storable(Component) {
  @primaryIdentifier() id;

  @attribute('string') title = '';

  @attribute('string') country = '';

  @attribute('Date') releaseDate;

  @method() async wasReleasedIn(year) {
    await this.load({releaseDate});

    return this.releaseDate().getFullYear() === year;
  }
}
```

```
// TS

import {Component} from '@layr/component';
import {Storable, primaryIdentifier, attribute, method} from '@layr/storable';

class Movie extends Storable(Component) {
  @primaryIdentifier() id!: string;

  @attribute('string') title = '';

  @attribute('string') country = '';

  @attribute('Date') releaseDate!: Date;

  @method() async wasReleasedIn(year: number) {
    await this.load({releaseDate});

    return this.releaseDate().getUTCFullYear() === year;
  }
}
```

Notice the `wasReleasedIn()` method that allows us to determine if a movie was released in a specific year. We could use this method as follows:

```
const movie = new Movie({
  title: 'Inception',
  country: 'USA',
  releaseDate: new Date('2010-07-16')
});

await movie.wasReleasedIn(2010); // => true
await movie.wasReleasedIn(2011); // => false
```

So far, there is nothing special about the `wasReleasedIn()` method. We could have achieved the same result without the [`@method()`](https://layrjs.com/docs/v2/reference/storable#method-decorator) decorator.

Now, let's imagine that we want to find all the movies that was released in 2010. We could do so as follows:

```
await Movie.find({
  releaseDate: {
    $greaterThanOrEqual: new Date('2010-01-01'),
    $lessThan: new Date('2011-01-01')
  }
});
```

That would certainly work, but wouldn't it be great if we could do the following instead:

```
await Movie.find({wasReleasedIn: 2010});
```

Unfortunately, the above [`Query`](https://layrjs.com/docs/v2/reference/query) wouldn't work. To make such a query possible, we must somehow transform the logic of the `wasReleasedIn()` method into a regular query, and this is exactly where a `StorableMethod` can be useful.

Because the `wasReleasedIn()` method is a `StorableMethod` (thanks to the [`@method()`](https://layrjs.com/docs/v2/reference/storable#method-decorator) decorator), we can can associate a [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type) to it by adding the [`@finder()`](https://layrjs.com/docs/v2/reference/storable#finder-decorator) decorator:

```
// JS

// ...

import {finder} from '@layr/storable';

class Movie extends Storable(Component) {
  // ...

  @finder(function (year) {
    return {
      releaseDate: {
        $greaterThanOrEqual: new Date(`${year}-01-01`),
        $lessThan: new Date(`${year + 1}-01-01`)
      }
    };
  })
  @method()
  async wasReleasedIn(year) {
    // ...
  }
}
```

```
// TS

// ...

import {finder} from '@layr/storable';

class Movie extends Storable(Component) {
  // ...

  @finder(function (year: number) {
    return {
      releaseDate: {
        $greaterThanOrEqual: new Date(`${year}-01-01`),
        $lessThan: new Date(`${year + 1}-01-01`)
      }
    };
  })
  @method()
  async wasReleasedIn(year: number) {
    // ...
  }
}
```

And now, it is possible to use the `wasReleasedIn()` method in any query:

```
// Find all the movies released in 2010
await Movie.find({wasReleasedIn: 2010});

// Find all the American movies released in 2010
await Movie.find({country: 'USA', wasReleasedIn: 2010});
```

#### Creation

##### `new StorableMethod(name, parent, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates a storable method. Typically, instead of using this constructor, you would rather use the [`@method()`](https://layrjs.com/docs/v2/reference/storable#method-decorator) decorator.

**Parameters:**

* `name`: The name of the method.
* `parent`: The [storable component](https://layrjs.com/docs/v2/reference/storable#storable-component-class) class, prototype, or instance that owns the method.
* `options`: An object specifying any option supported by the constructor of [`Method`](https://layrjs.com/docs/v2/reference/method#constructor) and [`StorableProperty`](https://layrjs.com/docs/v2/reference/storable-property#constructor).

**Returns:**

The [`StorableMethod`](https://layrjs.com/docs/v2/reference/storable-method) instance that was created.

#### Property Methods

See the methods that are inherited from the [`Property`](https://layrjs.com/docs/v2/reference/property#basic-methods) class.

#### Finder

See the methods that are inherited from the [`StorableProperty`](https://layrjs.com/docs/v2/reference/storable-property#finder) class.

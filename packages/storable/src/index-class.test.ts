import {Component, provide} from '@layr/component';

import {Storable} from './storable';
import {primaryIdentifier, secondaryIdentifier, attribute, loader, method} from './decorators';
import {Index} from './index-class';

describe('Index', () => {
  test('Creation', async () => {
    class Person extends Storable(Component) {
      @primaryIdentifier() id!: string;

      @attribute('string') fullName!: string;
    }

    class Movie extends Storable(Component) {
      @provide() static Person = Person;

      @primaryIdentifier() id!: string;

      @secondaryIdentifier() slug!: string;

      @attribute('string') title!: string;

      @attribute('number') year!: number;

      @loader(async function (this: Movie) {
        await this.load({year: true});

        return this.year <= new Date().getFullYear();
      })
      @attribute('boolean')
      isReleased!: boolean;

      @attribute('object') details!: any;

      @attribute('object[]') history!: any[];

      @attribute('Person') director!: Person;

      @attribute('Person[]') actors!: Person[];

      @method() play() {}
    }

    let index = new Index({title: 'asc'}, Movie.prototype);

    expect(Index.isIndex(index)).toBe(true);
    expect(index.getAttributes()).toStrictEqual({title: 'asc'});
    expect(index.getParent()).toBe(Movie.prototype);
    expect(index.getOptions().isUnique).not.toBe(true);

    index = new Index({title: 'desc'}, Movie.prototype, {isUnique: true});

    expect(Index.isIndex(index)).toBe(true);
    expect(index.getAttributes()).toStrictEqual({title: 'desc'});
    expect(index.getOptions().isUnique).toBe(true);

    index = new Index({year: 'desc', id: 'asc'}, Movie.prototype);

    expect(Index.isIndex(index)).toBe(true);
    expect(index.getAttributes()).toStrictEqual({year: 'desc', id: 'asc'});

    expect(() => new Index({}, Movie.prototype)).toThrow(
      "Cannot create an index for an empty 'attributes' parameter (component: 'Movie')"
    );

    // @ts-expect-error
    expect(() => new Index('title', Movie.prototype)).toThrow(
      "Expected a plain object, but received a value of type 'string'"
    );

    // @ts-expect-error
    expect(() => new Index({title: 'asc'}, Movie)).toThrow(
      "Expected a storable component instance, but received a value of type 'typeof Movie'"
    );

    expect(() => new Index({country: 'asc'}, Movie.prototype)).toThrow(
      "Cannot create an index for an attribute that doesn't exist (component: 'Movie', attribute: 'country')"
    );

    expect(() => new Index({play: 'asc'}, Movie.prototype)).toThrow(
      "Cannot create an index for a property that is not an attribute (component: 'Movie', property: 'play')"
    );

    expect(() => new Index({id: 'asc'}, Movie.prototype)).toThrow(
      "Cannot explicitly create an index for an identifier attribute (component: 'Movie', attribute: 'id'). Note that this type of attribute is automatically indexed."
    );

    expect(() => new Index({slug: 'asc'}, Movie.prototype)).toThrow(
      "Cannot explicitly create an index for an identifier attribute (component: 'Movie', attribute: 'slug'). Note that this type of attribute is automatically indexed."
    );

    expect(() => new Index({details: 'asc'}, Movie.prototype)).toThrow(
      "Cannot create an index for an attribute of type 'object' (component: 'Movie', attribute: 'details')"
    );

    expect(() => new Index({history: 'asc'}, Movie.prototype)).toThrow(
      "Cannot create an index for an attribute of type 'object' (component: 'Movie', attribute: 'history')"
    );

    expect(() => new Index({director: 'asc'}, Movie.prototype)).toThrow(
      "Cannot explicitly create an index for an attribute of type 'Component' (component: 'Movie', attribute: 'director'). Note that primary identifier attributes of referenced components are automatically indexed."
    );

    expect(() => new Index({actors: 'asc'}, Movie.prototype)).toThrow(
      "Cannot explicitly create an index for an attribute of type 'Component' (component: 'Movie', attribute: 'actors'). Note that primary identifier attributes of referenced components are automatically indexed."
    );

    expect(() => new Index({isReleased: 'asc'}, Movie.prototype)).toThrow(
      "Cannot create an index for a computed attribute (component: 'Movie', attribute: 'isReleased')"
    );

    // @ts-expect-error
    expect(() => new Index({title: 'ASC'}, Movie.prototype)).toThrow(
      "Cannot create an index with an invalid sort direction (component: 'Movie', attribute: 'title', sort direction: 'ASC')"
    );

    // @ts-expect-error
    expect(() => new Index({title: 'asc'}, Movie.prototype, {unknownOption: 123})).toThrow(
      "Did not expect the option 'unknownOption' to exist"
    );
  });
});

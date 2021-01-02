import {Component, provide} from '@layr/component';
import {Storable, primaryIdentifier, secondaryIdentifier, attribute, index} from '@layr/storable';

import {Store} from './store';
import {isStoreInstance} from './utilities';

describe('Store', () => {
  class MockStore extends Store {
    async createDocument() {
      return false;
    }

    async readDocument() {
      return undefined;
    }

    async updateDocument() {
      return false;
    }

    async deleteDocument() {
      return false;
    }

    async findDocuments() {
      return [];
    }

    async countDocuments() {
      return 0;
    }

    async migrateCollection() {
      return {
        name: 'Component',
        createdIndexes: [],
        droppedIndexes: []
      };
    }
  }

  test('Creation', async () => {
    const store = new MockStore();

    expect(isStoreInstance(store)).toBe(true);

    expect(() => new MockStore({unknown: true})).toThrow(
      "Did not expect the option 'unknown' to exist"
    );
  });

  test('registerRootComponent() and getRootComponents()', async () => {
    class Profile extends Storable(Component) {}

    class User extends Storable(Component) {
      @provide() static Profile = Profile;
    }

    class Movie extends Storable(Component) {}

    class Root extends Component {
      @provide() static User = User;
      @provide() static Movie = Movie;
    }

    const store = new MockStore();

    store.registerRootComponent(Root);

    expect(Array.from(store.getRootComponents())).toEqual([Root]);

    expect(Array.from(store.getStorables())).toEqual([User, Profile, Movie]);
  });

  test('getStorable() and hasStorable()', async () => {
    class User extends Storable(Component) {}

    const store = new MockStore();

    expect(store.hasStorable('User')).toBe(false);
    expect(() => store.getStorable('User')).toThrow(
      "The storable component 'User' is not registered in the store"
    );

    store.registerRootComponent(User);

    expect(store.hasStorable('User')).toBe(true);
    expect(store.getStorable('User')).toBe(User);
  });

  test('getStorableOfType()', async () => {
    class User extends Storable(Component) {}

    const store = new MockStore();

    store.registerRootComponent(User);

    expect(store.getStorableOfType('typeof User')).toBe(User);
    expect(store.getStorableOfType('User')).toBe(User.prototype);

    expect(() => store.getStorableOfType('typeof Movie')).toThrow(
      "The storable component of type 'typeof Movie' is not registered in the store"
    );
  });

  test('registerStorable()', async () => {
    class User extends Storable(Component) {}

    const store = new MockStore();

    store.registerStorable(User);

    expect(store.getStorable('User')).toBe(User);

    // Registering a storable twice in the same store should be okay
    store.registerStorable(User);

    expect(store.getStorable('User')).toBe(User);

    class NotAStorable {}

    // @ts-expect-error
    expect(() => store.registerStorable(NotAStorable)).toThrow(
      "Expected a storable component class, but received a value of type 'typeof NotAStorable'"
    );

    const store2 = new MockStore();

    expect(() => store2.registerStorable(User)).toThrow(
      "Cannot register a storable component that is already registered in another store (component: 'User')"
    );

    class User2 extends Storable(Component) {}

    User2.setComponentName('User');

    expect(() => store.registerStorable(User2)).toThrow(
      "A storable component with the same name is already registered (component: 'User')"
    );
  });

  test('getStorables()', async () => {
    class User extends Storable(Component) {}

    class Movie extends Storable(Component) {}

    const store = new MockStore();

    expect(Array.from(store.getStorables())).toEqual([]);

    store.registerStorable(User);

    expect(Array.from(store.getStorables())).toEqual([User]);

    store.registerStorable(Movie);

    expect(Array.from(store.getStorables())).toEqual([User, Movie]);
  });

  test('getCollectionSchema()', async () => {
    class Person extends Storable(Component) {
      @primaryIdentifier() id!: string;

      @attribute('string') fullName!: string;
    }

    @index({year: 'desc', title: 'asc'})
    @index({director: 'asc', title: 'asc'})
    class Movie extends Storable(Component) {
      @provide() static Person = Person;

      @primaryIdentifier() id!: string;

      @secondaryIdentifier() slug!: string;

      @index({isUnique: true}) @attribute('string') title!: string;

      @index({direction: 'desc'}) @attribute('number') year!: number;

      @attribute('string') summary!: string;

      @index() @attribute('string[]') genres!: string[];

      @attribute('Person') director!: Person;

      @attribute('Person[]') actors!: Person[];
    }

    const store = new MockStore();

    store.registerStorable(Movie);

    const schema = store.getCollectionSchema(Movie.prototype);

    expect(schema).toStrictEqual({
      indexes: [
        {attributes: {id: 'asc'}, isPrimary: true, isUnique: true},
        {attributes: {slug: 'asc'}, isPrimary: false, isUnique: true},
        {
          attributes: {'director.id': 'asc'},
          isPrimary: false,
          isUnique: false
        },
        {
          attributes: {'actors.id': 'asc'},
          isPrimary: false,
          isUnique: false
        },
        {attributes: {title: 'asc'}, isPrimary: false, isUnique: true},
        {attributes: {year: 'desc'}, isPrimary: false, isUnique: false},
        {attributes: {genres: 'asc'}, isPrimary: false, isUnique: false},
        {
          attributes: {'director.id': 'asc', 'title': 'asc'},
          isPrimary: false,
          isUnique: false
        },
        {
          attributes: {year: 'desc', title: 'asc'},
          isPrimary: false,
          isUnique: false
        }
      ]
    });
  });
});

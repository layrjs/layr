import {Registry} from '../../..';

describe('@storable/registry', () => {
  test('Simple registry', () => {
    class Item {}
    class Movie extends Item {}

    const registry = new Registry({Item, Movie});

    expect(registry.Movie).not.toBe(Movie);

    expect(Movie.$registry).toBeUndefined();
    expect(registry.Movie.$registry).toBe(registry);

    const movie = new registry.Movie();

    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie instanceof registry.Item).toBe(true);
    expect(movie.constructor.$registry).toBe(registry);

    registry.register('user', {id: 'abc123'});
    expect(registry.user.id).toEqual('abc123');

    expect(() => {
      registry.register('user', {id: 'xyz123'}); // Cannot register an item with a key that has already been registered
    }).toThrow();

    expect(() => {
      registry.user = {id: 'xyz123'}; // Cannot modify a registered item
    }).toThrow();

    const anotherRegistry = new Registry({Movie});
    expect(anotherRegistry.Movie.$registry).toBe(anotherRegistry);

    expect(() => {
      anotherRegistry.register('user', registry.user); // Cannot register an already registered item
    }).toThrow();
  });

  test('Forked repository', () => {
    const store = {};
    class Item {}
    class Movie extends Item {}

    const registry = new Registry({store, Item, Movie});
    const subregistry = registry.fork({user: {id: 'xyz123'}});

    expect(subregistry.Movie.prototype instanceof subregistry.Item).toBe(true);
    expect(subregistry.user.id).toBe('xyz123');
    expect(registry.user).toBeUndefined();

    subregistry.store.transaction = 12345;
    expect(subregistry.store.transaction).toBe(12345);
    expect(registry.store.transaction).toBeUndefined();
  });
});

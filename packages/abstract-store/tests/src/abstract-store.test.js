import {Storable} from '@liaison/storable';

import {AbstractStore, isStore} from '../../..';

describe('AbstractStore', () => {
  test('Creation', async () => {
    class Store extends AbstractStore {}

    class User extends Storable {}

    let store = new Store();

    expect(store.getStorables()).toEqual([]);

    store = new AbstractStore([User]);

    expect(store.getStorables()).toEqual([User]);
    expect(User.getStore()).toBe(store);
  });

  test('isStore()', async () => {
    class Store extends AbstractStore {}

    const store = new Store();

    expect(isStore(store)).toBe(true);

    class NotAStore {}

    const notAStore = new NotAStore();

    expect(isStore(notAStore)).toBe(false);
  });

  test('getStorable()', async () => {
    class Store extends AbstractStore {}

    class User extends Storable {}

    const store = new Store();

    expect(() => store.getStorable('User')).toThrow(
      "The storable class 'User' is not registered in the store"
    );
    expect(store.getStorable('User', {throwIfMissing: false})).toBe(undefined);

    store.registerStorable(User);

    expect(store.getStorable('User')).toBe(User);
    expect(store.getStorable('user', {includePrototypes: true})).toBe(User.prototype);

    expect(() => store.getStorable('user')).toThrow(
      "The specified component name ('user') is invalid"
    );
    expect(() => store.getStorable('movie', {includePrototypes: true})).toThrow(
      "The storable class 'Movie' is not registered in the store"
    );
  });

  test('registerStorable()', async () => {
    class Store extends AbstractStore {}

    class User extends Storable {}

    const store = new Store();

    store.registerStorable(User);

    expect(store.getStorable('User')).toBe(User);

    class NotAStorable {}

    expect(() => store.registerStorable(NotAStorable)).toThrow(
      "Expected a storable class, but received a value of type 'NotAStorable'"
    );

    expect(() => store.registerStorable(User)).toThrow(
      "Cannot register a storable that is already registered (storable name: 'User')"
    );

    class SuperUser extends Storable {}

    SuperUser.setComponentName('User');

    expect(() => store.registerStorable(SuperUser)).toThrow(
      "A storable with the same name is already registered (storable name: 'User')"
    );
  });

  test('getStorables()', async () => {
    class Store extends AbstractStore {}

    class User extends Storable {}

    class Movie extends Storable {}

    const store = new Store();

    expect(store.getStorables()).toEqual([]);

    store.registerStorable(User);

    expect(store.getStorables()).toEqual([User]);

    store.registerStorable(Movie);

    expect(store.getStorables()).toEqual([User, Movie]);
  });
});

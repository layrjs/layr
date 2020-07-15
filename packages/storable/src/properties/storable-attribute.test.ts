import {Component} from '@liaison/component';

import {Storable} from '../storable';
import {StorableAttribute, isStorableAttributeInstance} from './storable-attribute';

describe('StorableAttribute', () => {
  test('new StorableAttribute()', async () => {
    class Movie extends Storable(Component) {}

    let loaderHasBeenCalled = false;
    let finderHasBeenCalled = false;
    let beforeLoadHasBeenCalled = false;

    const storableAttribute = new StorableAttribute('title', Movie.prototype, {
      valueType: 'string',
      async loader() {
        expect(this).toBe(Movie.prototype);
        loaderHasBeenCalled = true;
      },
      async finder() {
        expect(this).toBe(Movie.prototype);
        finderHasBeenCalled = true;
      },
      async beforeLoad() {
        expect(this).toBe(Movie.prototype);
        beforeLoadHasBeenCalled = true;
      }
    });

    expect(isStorableAttributeInstance(storableAttribute)).toBe(true);
    expect(storableAttribute.getName()).toBe('title');
    expect(storableAttribute.getParent()).toBe(Movie.prototype);

    expect(storableAttribute.hasLoader()).toBe(true);
    expect(storableAttribute.hasFinder()).toBe(true);
    expect(storableAttribute.isComputed()).toBe(true);
    expect(storableAttribute.hasHook('beforeLoad')).toBe(true);

    expect(loaderHasBeenCalled).toBe(false);
    await storableAttribute.callLoader();
    expect(loaderHasBeenCalled).toBe(true);

    expect(finderHasBeenCalled).toBe(false);
    await storableAttribute.callFinder(1);
    expect(finderHasBeenCalled).toBe(true);

    expect(beforeLoadHasBeenCalled).toBe(false);
    await storableAttribute.callHook('beforeLoad');
    expect(beforeLoadHasBeenCalled).toBe(true);

    const otherStorableAttribute = new StorableAttribute('country', Movie.prototype, {
      valueType: 'string'
    });

    expect(otherStorableAttribute.hasLoader()).toBe(false);
    expect(otherStorableAttribute.hasFinder()).toBe(false);
    expect(otherStorableAttribute.isComputed()).toBe(false);
    await expect(otherStorableAttribute.callLoader()).rejects.toThrow(
      "Cannot call a loader that is missing (attribute: 'Movie.prototype.country')"
    );
    await expect(otherStorableAttribute.callFinder(1)).rejects.toThrow(
      "Cannot call a finder that is missing (attribute: 'Movie.prototype.country')"
    );

    expect(otherStorableAttribute.hasHook('beforeLoad')).toBe(false);
    await expect(otherStorableAttribute.callHook('beforeLoad')).rejects.toThrow(
      "Cannot call a hook that is missing (attribute: 'Movie.prototype.country', hook: 'beforeLoad')"
    );
  });

  test('Introspection', async () => {
    class Movie extends Storable(Component) {}

    expect(
      new StorableAttribute('limit', Movie, {
        valueType: 'number',
        value: 100,
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'limit',
      type: 'StorableAttribute',
      valueType: 'number',
      value: 100,
      exposure: {get: true}
    });
  });

  test('Unintrospection', async () => {
    expect(
      StorableAttribute.unintrospect({
        name: 'limit',
        type: 'StorableAttribute',
        valueType: 'number',
        value: 100,
        exposure: {get: true}
      })
    ).toEqual({
      name: 'limit',
      options: {valueType: 'number', value: 100, exposure: {get: true}}
    });
  });
});

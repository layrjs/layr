import {Storable, StorableAttribute, isStorableAttribute} from '../../..';

describe('StorableAttribute', () => {
  test('new StorableAttribute()', async () => {
    class Movie extends Storable {}

    let loaderHasBeenCalled = false;
    let finderHasBeenCalled = false;
    let beforeLoadHasBeenCalled = false;

    const storableAttribute = new StorableAttribute('title', Movie.prototype, {
      type: 'string',
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

    expect(isStorableAttribute(storableAttribute)).toBe(true);
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
    await storableAttribute.callFinder();
    expect(finderHasBeenCalled).toBe(true);

    expect(beforeLoadHasBeenCalled).toBe(false);
    await storableAttribute.callHook('beforeLoad');
    expect(beforeLoadHasBeenCalled).toBe(true);

    const otherStorableAttribute = new StorableAttribute('country', Movie.prototype, {
      type: 'string'
    });

    expect(otherStorableAttribute.hasLoader()).toBe(false);
    expect(otherStorableAttribute.hasFinder()).toBe(false);
    expect(otherStorableAttribute.isComputed()).toBe(false);
    await expect(otherStorableAttribute.callLoader()).rejects.toThrow(
      "Cannot call a loader that is missing (storable name: 'movie', attribute name: 'country')"
    );
    await expect(otherStorableAttribute.callFinder()).rejects.toThrow(
      "Cannot call a finder that is missing (storable name: 'movie', attribute name: 'country')"
    );

    expect(otherStorableAttribute.hasHook('beforeLoad')).toBe(false);
    await expect(otherStorableAttribute.callHook('beforeLoad')).rejects.toThrow(
      "Cannot call a hook that is missing (storable name: 'movie', attribute name: 'country', hook name: 'beforeLoad')"
    );
  });

  test('Introspection', async () => {
    class Movie extends Storable {}

    expect(
      new StorableAttribute('limit', Movie, {
        type: 'number',
        value: 100,
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'limit',
      type: 'storableAttribute',
      valueType: 'number',
      value: 100,
      exposure: {get: true}
    });
  });

  test('Unintrospection', async () => {
    expect(
      StorableAttribute.unintrospect({
        name: 'limit',
        valueType: 'number',
        value: 100,
        exposure: {get: true}
      })
    ).toEqual({
      name: 'limit',
      options: {type: 'number', value: 100, exposure: {get: true}}
    });
  });
});

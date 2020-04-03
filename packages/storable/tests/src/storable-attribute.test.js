import {Storable, StorableAttribute, isStorableAttribute} from '../../..';

describe('StorableAttribute', () => {
  test('new StorableAttribute()', async () => {
    class Movie extends Storable {}

    let loaderHasBeenCalled = false;
    let beforeLoadHasBeenCalled = false;

    const storableAttribute = new StorableAttribute('limit', Movie, {
      type: 'number',
      async loader() {
        expect(this).toBe(Movie);
        loaderHasBeenCalled = true;
      },
      async beforeLoad() {
        expect(this).toBe(Movie);
        beforeLoadHasBeenCalled = true;
      }
    });

    expect(isStorableAttribute(storableAttribute)).toBe(true);
    expect(storableAttribute.getName()).toBe('limit');
    expect(storableAttribute.getParent()).toBe(Movie);

    expect(storableAttribute.hasLoader()).toBe(true);
    expect(storableAttribute.isComputed()).toBe(true);
    expect(storableAttribute.hasHook('beforeLoad')).toBe(true);

    expect(loaderHasBeenCalled).toBe(false);
    await storableAttribute.callLoader();
    expect(loaderHasBeenCalled).toBe(true);

    expect(beforeLoadHasBeenCalled).toBe(false);
    await storableAttribute.callHook('beforeLoad');
    expect(beforeLoadHasBeenCalled).toBe(true);

    const otherStorableAttribute = new StorableAttribute('offset', Movie, {type: 'number'});

    expect(otherStorableAttribute.hasLoader()).toBe(false);
    expect(otherStorableAttribute.isComputed()).toBe(false);
    await expect(otherStorableAttribute.callLoader()).rejects.toThrow(
      "Cannot call a loader that is missing (storable name: 'Movie', attribute name: 'offset')"
    );

    expect(otherStorableAttribute.hasHook('beforeLoad')).toBe(false);
    await expect(otherStorableAttribute.callHook('beforeLoad')).rejects.toThrow(
      "Cannot call a hook that is missing (storable name: 'Movie', attribute name: 'offset', hook name: 'beforeLoad')"
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

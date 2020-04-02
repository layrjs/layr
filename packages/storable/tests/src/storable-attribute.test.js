import {Storable, StorableAttribute, isStorableAttribute} from '../../..';

describe('StorableAttribute', () => {
  test('new StorableAttribute()', async () => {
    class Movie extends Storable {}

    let beforeLoadHasBeenCalled = false;

    const storableAttribute = new StorableAttribute('limit', Movie, {
      type: 'number',
      beforeLoad() {
        expect(this).toBe(Movie);
        beforeLoadHasBeenCalled = true;
      }
    });

    expect(isStorableAttribute(storableAttribute)).toBe(true);
    expect(storableAttribute.getName()).toBe('limit');
    expect(storableAttribute.getParent()).toBe(Movie);
    expect(storableAttribute.hasHook('beforeLoad')).toBe(true);

    expect(beforeLoadHasBeenCalled).toBe(false);

    await storableAttribute.callHook('beforeLoad');

    expect(beforeLoadHasBeenCalled).toBe(true);

    expect(storableAttribute.hasHook('afterLoad')).toBe(false);
    await expect(storableAttribute.callHook('afterLoad')).rejects.toThrow(
      "Cannot call a hook that is missing (storable name: 'Movie', attribute name: 'limit', hook name: 'afterLoad')"
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

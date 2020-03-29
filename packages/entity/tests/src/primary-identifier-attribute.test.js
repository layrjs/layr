import {StringType, NumberType} from '@liaison/model';

import {
  Entity,
  PrimaryIdentifierAttribute,
  isPrimaryIdentifierAttribute,
  primaryIdentifierAttributeStringDefaultValue
} from '../../..';

describe('PrimaryIdentifierAttribute', () => {
  test('Creation', async () => {
    class Movie extends Entity {}

    let idAttribute = new PrimaryIdentifierAttribute('id', Movie.prototype);

    expect(isPrimaryIdentifierAttribute(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie.prototype);
    expect(idAttribute.getType()).toBeInstanceOf(StringType);
    expect(typeof idAttribute.getDefaultValueFunction()).toBe('function');

    idAttribute = new PrimaryIdentifierAttribute('id', Movie.prototype, {type: 'number'});

    expect(isPrimaryIdentifierAttribute(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie.prototype);
    expect(idAttribute.getType()).toBeInstanceOf(NumberType);
    expect(idAttribute.getDefaultValueFunction()).toBeUndefined();
  });

  test('Value', async () => {
    class Movie extends Entity {}

    const idAttribute = new PrimaryIdentifierAttribute('id', Movie.prototype);

    expect(idAttribute.isSet()).toBe(false);

    idAttribute.setValue('abc123');

    expect(idAttribute.getValue()).toBe('abc123');

    idAttribute.setValue('abc123');

    expect(idAttribute.getValue()).toBe('abc123');

    expect(() => idAttribute.setValue('xyz789')).toThrow(
      "The value of a primary identifier attribute cannot be modified (entity name: 'movie', attribute name: 'id')"
    );
  });

  test('Generated ids', async () => {
    class Movie extends Entity {}

    const idAttribute = new PrimaryIdentifierAttribute('id', Movie.prototype);

    const id = idAttribute.getDefaultValue();

    expect(typeof id).toBe('string');
    expect(id.length >= 25);
  });

  test('Introspection', async () => {
    class Movie extends Entity {}

    expect(
      new PrimaryIdentifierAttribute('id', Movie.prototype, {exposure: {get: true}}).introspect()
    ).toStrictEqual({
      name: 'id',
      type: 'primaryIdentifierAttribute',
      valueType: 'string',
      default: primaryIdentifierAttributeStringDefaultValue,
      exposure: {get: true}
    });

    expect(
      new PrimaryIdentifierAttribute('id', Movie.prototype, {
        type: 'number',
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'id',
      type: 'primaryIdentifierAttribute',
      valueType: 'number',
      exposure: {get: true}
    });
  });

  test('Unintrospection', async () => {
    expect(
      PrimaryIdentifierAttribute.unintrospect({
        name: 'id',
        valueType: 'string',
        default: primaryIdentifierAttributeStringDefaultValue,
        exposure: {get: true}
      })
    ).toEqual({
      name: 'id',
      options: {
        type: 'string',
        default: primaryIdentifierAttributeStringDefaultValue,
        exposure: {get: true}
      }
    });

    expect(
      PrimaryIdentifierAttribute.unintrospect({
        name: 'id',
        valueType: 'number',
        exposure: {get: true}
      })
    ).toEqual({
      name: 'id',
      options: {
        type: 'number',
        exposure: {get: true}
      }
    });
  });
});

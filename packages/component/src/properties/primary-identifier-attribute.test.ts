import {Component} from '../component';
import {
  PrimaryIdentifierAttribute,
  isPrimaryIdentifierAttributeInstance,
  primaryIdentifierAttributeStringDefaultValue
} from './primary-identifier-attribute';
import {isStringValueTypeInstance, isNumberValueTypeInstance} from './value-types';

describe('PrimaryIdentifierAttribute', () => {
  test('Creation', async () => {
    class Movie extends Component {}

    let idAttribute = new PrimaryIdentifierAttribute('id', Movie.prototype);

    expect(isPrimaryIdentifierAttributeInstance(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie.prototype);
    expect(isStringValueTypeInstance(idAttribute.getValueType())).toBe(true);
    expect(idAttribute.getDefault()).toBe(primaryIdentifierAttributeStringDefaultValue);

    idAttribute = new PrimaryIdentifierAttribute('id', Movie.prototype, {valueType: 'number'});

    expect(isPrimaryIdentifierAttributeInstance(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie.prototype);
    expect(isNumberValueTypeInstance(idAttribute.getValueType())).toBe(true);
    expect(idAttribute.getDefault()).toBeUndefined();
  });

  test('Value', async () => {
    class Movie extends Component {}

    const idAttribute = new PrimaryIdentifierAttribute('id', Movie.prototype);

    expect(idAttribute.isSet()).toBe(false);

    idAttribute.setValue('abc123');

    expect(idAttribute.getValue()).toBe('abc123');

    idAttribute.setValue('abc123');

    expect(idAttribute.getValue()).toBe('abc123');

    expect(() => idAttribute.setValue('xyz789')).toThrow(
      "The value of a primary identifier attribute cannot be modified (attribute: 'Movie.prototype.id')"
    );
  });

  test('Default value', async () => {
    class Movie extends Component {}

    const idAttribute = new PrimaryIdentifierAttribute('id', Movie.prototype);

    const id = idAttribute.evaluateDefault() as string;

    expect(typeof id).toBe('string');
    expect(id.length >= 25).toBe(true);
  });

  test('Introspection', async () => {
    class Movie extends Component {}

    expect(
      new PrimaryIdentifierAttribute('id', Movie.prototype, {
        exposure: {get: true, set: true}
      }).introspect()
    ).toStrictEqual({
      name: 'id',
      type: 'PrimaryIdentifierAttribute',
      valueType: 'string',
      default: primaryIdentifierAttributeStringDefaultValue,
      exposure: {get: true, set: true}
    });

    expect(
      new PrimaryIdentifierAttribute('id', Movie.prototype, {
        valueType: 'number',
        exposure: {get: true, set: true}
      }).introspect()
    ).toStrictEqual({
      name: 'id',
      type: 'PrimaryIdentifierAttribute',
      valueType: 'number',
      exposure: {get: true, set: true}
    });
  });

  test('Unintrospection', async () => {
    expect(
      PrimaryIdentifierAttribute.unintrospect({
        name: 'id',
        type: 'PrimaryIdentifierAttribute',
        valueType: 'string',
        default: primaryIdentifierAttributeStringDefaultValue,
        exposure: {get: true}
      })
    ).toEqual({
      name: 'id',
      options: {
        valueType: 'string',
        default: primaryIdentifierAttributeStringDefaultValue,
        exposure: {get: true}
      }
    });

    expect(
      PrimaryIdentifierAttribute.unintrospect({
        name: 'id',
        type: 'PrimaryIdentifierAttribute',
        valueType: 'number',
        exposure: {get: true}
      })
    ).toEqual({
      name: 'id',
      options: {
        valueType: 'number',
        exposure: {get: true}
      }
    });
  });
});

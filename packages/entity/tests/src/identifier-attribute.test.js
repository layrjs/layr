import {Entity, IdentifierAttribute, isIdentifierAttribute, StringType, NumberType} from '../../..';

describe('IdentifierAttribute', () => {
  test('Creation', async () => {
    class Movie extends Entity() {}

    let idAttribute = new IdentifierAttribute('id', Movie.prototype);

    expect(isIdentifierAttribute(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie.prototype);
    expect(idAttribute.getType()).toBeInstanceOf(StringType);

    idAttribute = new IdentifierAttribute('id', Movie.prototype, {type: 'number'});

    expect(isIdentifierAttribute(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie.prototype);
    expect(idAttribute.getType()).toBeInstanceOf(NumberType);

    expect(() => new IdentifierAttribute('id', Movie.prototype, {type: 'boolean'})).toThrow(
      "The type of an identifier attribute must be 'string' or 'number' (attribute name: 'id', specified type: 'boolean')"
    );

    expect(() => new IdentifierAttribute('id', Movie.prototype, {type: 'string?'})).toThrow(
      "The value of an identifier attribute cannot be optional (attribute name: 'id', specified type: 'string?')"
    );
  });

  test('Introspection', async () => {
    class Movie extends Entity() {}

    const defaultValueFunction = function() {
      return this.constructor.generateId();
    };

    expect(
      new IdentifierAttribute('id', Movie.prototype, {
        type: 'string',
        default: defaultValueFunction,
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'id',
      type: 'identifierAttribute',
      valueType: 'string',
      default: defaultValueFunction,
      exposure: {get: true}
    });
  });
});

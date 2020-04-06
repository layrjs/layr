import {isStringType, isNumberType} from '@liaison/model';

import {Entity, IdentifierAttribute, isIdentifierAttribute} from '../../..';

describe('IdentifierAttribute', () => {
  test('Creation', async () => {
    class Movie extends Entity {}

    let idAttribute = new IdentifierAttribute('id', Movie.prototype);

    expect(isIdentifierAttribute(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie.prototype);
    expect(isStringType(idAttribute.getType())).toBe(true);

    idAttribute = new IdentifierAttribute('id', Movie.prototype, {type: 'number'});

    expect(isIdentifierAttribute(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie.prototype);
    expect(isNumberType(idAttribute.getType())).toBe(true);

    expect(() => new IdentifierAttribute('id', Movie.prototype, {type: 'boolean'})).toThrow(
      "The type of an identifier attribute must be 'string' or 'number' (entity name: 'movie', attribute name: 'id', specified type: 'boolean')"
    );

    expect(() => new IdentifierAttribute('id', Movie.prototype, {type: 'string?'})).toThrow(
      "The value of an identifier attribute cannot be optional (entity name: 'movie', attribute name: 'id', specified type: 'string?')"
    );
  });

  test('Introspection', async () => {
    class Movie extends Entity {}

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

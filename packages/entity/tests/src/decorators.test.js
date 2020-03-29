import {Model, validators, StringType, NumberType} from '@liaison/model';

import {
  Entity,
  primaryIdentifier,
  isPrimaryIdentifierAttribute,
  secondaryIdentifier,
  isSecondaryIdentifierAttribute
} from '../../..';

describe('Decorators', () => {
  test('@primaryIdentifier()', async () => {
    const notEmpty = validators.notEmpty();

    class Movie1 extends Entity {
      @primaryIdentifier() id;
    }

    let idAttribute = Movie1.prototype.getPrimaryIdentifierAttribute();

    expect(isPrimaryIdentifierAttribute(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie1.prototype);
    expect(idAttribute.getType()).toBeInstanceOf(StringType);
    expect(idAttribute.getType().getValidators()).toEqual([]);
    expect(typeof idAttribute.getDefaultValueFunction()).toBe('function');

    class Movie2 extends Entity {
      @primaryIdentifier(undefined, {validators: [notEmpty]}) id;
    }

    idAttribute = Movie2.prototype.getPrimaryIdentifierAttribute();

    expect(isPrimaryIdentifierAttribute(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie2.prototype);
    expect(idAttribute.getType()).toBeInstanceOf(StringType);
    expect(idAttribute.getType().getValidators()).toEqual([notEmpty]);
    expect(typeof idAttribute.getDefaultValueFunction()).toBe('function');

    class Movie3 extends Entity {
      @primaryIdentifier('number') id;
    }

    idAttribute = Movie3.prototype.getPrimaryIdentifierAttribute();

    expect(isPrimaryIdentifierAttribute(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie3.prototype);
    expect(idAttribute.getType()).toBeInstanceOf(NumberType);
    expect(idAttribute.getType().getValidators()).toEqual([]);
    expect(idAttribute.getDefaultValueFunction()).toBeUndefined();

    class Movie4 extends Entity {
      @primaryIdentifier('number') id = Math.random();
    }

    idAttribute = Movie4.prototype.getPrimaryIdentifierAttribute();

    expect(isPrimaryIdentifierAttribute(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie4.prototype);
    expect(idAttribute.getType()).toBeInstanceOf(NumberType);
    expect(idAttribute.getType().getValidators()).toEqual([]);
    expect(typeof idAttribute.getDefaultValueFunction()).toBe('function');

    class Movie5 extends Entity {
      @primaryIdentifier('number', {validators: [notEmpty]}) id;
    }

    idAttribute = Movie5.prototype.getPrimaryIdentifierAttribute();

    expect(isPrimaryIdentifierAttribute(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie5.prototype);
    expect(idAttribute.getType()).toBeInstanceOf(NumberType);
    expect(idAttribute.getType().getValidators()).toEqual([notEmpty]);
    expect(idAttribute.getDefaultValueFunction()).toBeUndefined();

    expect(
      () =>
        class Movie extends Entity {
          @primaryIdentifier() static id;
        }
    ).toThrow("@primaryIdentifier() cannot be used with a static attribute (property name: 'id')");

    expect(
      () =>
        class Movie extends Model {
          @primaryIdentifier() id;
        }
    ).toThrow("@primaryIdentifier() target doesn't inherit from Entity (property name: 'id')");

    expect(
      () =>
        class Movie extends Entity {
          @primaryIdentifier() id() {}
        }
    ).toThrow(
      "@primaryIdentifier() cannot be used without an attribute declaration (property name: 'id')"
    );

    expect(
      () =>
        class Movie extends Entity {
          @primaryIdentifier() id;
          @primaryIdentifier() slug;
        }
    ).toThrow("The entity 'movie' has already a primary identifier attribute");
  });

  test('@secondaryIdentifier()', async () => {
    class User extends Entity {
      @secondaryIdentifier() email;
      @secondaryIdentifier() username;
    }

    const emailAttribute = User.prototype.getSecondaryIdentifierAttribute('email');

    expect(isSecondaryIdentifierAttribute(emailAttribute)).toBe(true);
    expect(emailAttribute.getName()).toBe('email');
    expect(emailAttribute.getParent()).toBe(User.prototype);
    expect(emailAttribute.getType()).toBeInstanceOf(StringType);
    expect(emailAttribute.getType().getValidators()).toEqual([]);
    expect(emailAttribute.getDefaultValueFunction()).toBeUndefined();

    const usernameAttribute = User.prototype.getSecondaryIdentifierAttribute('username');

    expect(isSecondaryIdentifierAttribute(usernameAttribute)).toBe(true);
    expect(usernameAttribute.getName()).toBe('username');
    expect(usernameAttribute.getParent()).toBe(User.prototype);
    expect(usernameAttribute.getType()).toBeInstanceOf(StringType);
    expect(usernameAttribute.getType().getValidators()).toEqual([]);
    expect(usernameAttribute.getDefaultValueFunction()).toBeUndefined();
  });
});

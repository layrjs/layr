import {
  Entity,
  SecondaryIdentifierAttribute,
  isSecondaryIdentifierAttribute,
  StringType
} from '../../..';

describe('SecondaryIdentifierAttribute', () => {
  test('Creation', async () => {
    class Movie extends Entity() {}

    const emailAttribute = new SecondaryIdentifierAttribute('email', Movie.prototype);

    expect(isSecondaryIdentifierAttribute(emailAttribute)).toBe(true);
    expect(emailAttribute.getName()).toBe('email');
    expect(emailAttribute.getParent()).toBe(Movie.prototype);
    expect(emailAttribute.getType()).toBeInstanceOf(StringType);
  });

  test('Value', async () => {
    class Movie extends Entity() {}

    const emailAttribute = new SecondaryIdentifierAttribute('email', Movie.prototype);

    expect(emailAttribute.isSet()).toBe(false);

    emailAttribute.setValue('hi@hello.com');

    expect(emailAttribute.getValue()).toBe('hi@hello.com');

    // Contrary to the primary identifier attributes, the value of the secondary identifier
    // attributes can be modified
    emailAttribute.setValue('salut@bonjour.com');

    expect(emailAttribute.getValue()).toBe('salut@bonjour.com');
  });

  test('Introspection', async () => {
    class Movie extends Entity() {}

    expect(
      new SecondaryIdentifierAttribute('email', Movie.prototype, {
        type: 'string',
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'email',
      type: 'secondaryIdentifierAttribute',
      valueType: 'string',
      exposure: {get: true}
    });
  });
});

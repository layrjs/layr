import {Component} from '../component';
import {
  SecondaryIdentifierAttribute,
  isSecondaryIdentifierAttributeInstance
} from './secondary-identifier-attribute';
import {isStringValueTypeInstance} from './value-types';

describe('SecondaryIdentifierAttribute', () => {
  test('Creation', async () => {
    class Movie extends Component {}

    const emailAttribute = new SecondaryIdentifierAttribute('email', Movie.prototype);

    expect(isSecondaryIdentifierAttributeInstance(emailAttribute)).toBe(true);
    expect(emailAttribute.getName()).toBe('email');
    expect(emailAttribute.getParent()).toBe(Movie.prototype);
    expect(isStringValueTypeInstance(emailAttribute.getValueType())).toBe(true);
  });

  test('Value', async () => {
    class Movie extends Component {}

    const emailAttribute = new SecondaryIdentifierAttribute('email', Movie.prototype);

    expect(emailAttribute.isSet()).toBe(false);

    emailAttribute.setValue('hi@hello.com');

    expect(emailAttribute.getValue()).toBe('hi@hello.com');

    // Contrary to a primary identifier attribute, the value of a secondary identifier
    // attribute can be modified
    emailAttribute.setValue('salut@bonjour.com');

    expect(emailAttribute.getValue()).toBe('salut@bonjour.com');
  });

  test('Introspection', async () => {
    class Movie extends Component {}

    expect(
      new SecondaryIdentifierAttribute('email', Movie.prototype, {
        valueType: 'string',
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'email',
      type: 'SecondaryIdentifierAttribute',
      valueType: 'string',
      exposure: {get: true}
    });
  });

  test('Unintrospection', async () => {
    expect(
      SecondaryIdentifierAttribute.unintrospect({
        name: 'email',
        type: 'SecondaryIdentifierAttribute',
        valueType: 'string',
        exposure: {get: true}
      })
    ).toEqual({
      name: 'email',
      options: {valueType: 'string', exposure: {get: true}}
    });
  });
});

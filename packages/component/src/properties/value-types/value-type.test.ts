import {Component} from '../../component';
import {Attribute} from '../attribute';
import {provide} from '../../decorators';
import {AnyValueType, isAnyValueTypeInstance} from './any-value-type';
import {BooleanValueType, isBooleanValueTypeInstance} from './boolean-value-type';
import {NumberValueType, isNumberValueTypeInstance} from './number-value-type';
import {StringValueType, isStringValueTypeInstance} from './string-value-type';
import {ObjectValueType, isObjectValueTypeInstance} from './object-value-type';
import {DateValueType, isDateValueTypeInstance} from './date-value-type';
import {RegExpValueType, isRegExpValueTypeInstance} from './regexp-value-type';
import {ArrayValueType, isArrayValueTypeInstance} from './array-value-type';
import {ComponentValueType, isComponentValueTypeInstance} from './component-value-type';

describe('ValueType', () => {
  class TestComponent extends Component {}

  const attribute = new Attribute('testAttribute', TestComponent.prototype);

  test('AnyValueType', async () => {
    let type = new AnyValueType(attribute);

    expect(isAnyValueTypeInstance(type)).toBe(true);

    expect(type.toString()).toBe('any');

    expect(() => type.checkValue(true, attribute)).not.toThrow();
    expect(() => type.checkValue(1, attribute)).not.toThrow();
    expect(() => type.checkValue('a', attribute)).not.toThrow();
    expect(() => type.checkValue({}, attribute)).not.toThrow();
    expect(() => type.checkValue(undefined, attribute)).not.toThrow();

    // The 'isOptional' option should no effects for the 'any' type
    type = new AnyValueType(attribute, {isOptional: true});

    expect(type.toString()).toBe('any');

    expect(() => type.checkValue(true, attribute)).not.toThrow();
    expect(() => type.checkValue(1, attribute)).not.toThrow();
    expect(() => type.checkValue('a', attribute)).not.toThrow();
    expect(() => type.checkValue({}, attribute)).not.toThrow();
    expect(() => type.checkValue(undefined, attribute)).not.toThrow();
  });

  test('BooleanValueType', async () => {
    let type = new BooleanValueType(attribute);

    expect(isBooleanValueTypeInstance(type)).toBe(true);

    expect(type.toString()).toBe('boolean');

    expect(() => type.checkValue(true, attribute)).not.toThrow();
    expect(() => type.checkValue(false, attribute)).not.toThrow();
    expect(() => type.checkValue(1, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'boolean', received type: 'number')"
    );
    expect(() => type.checkValue(undefined, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'boolean', received type: 'undefined')"
    );

    type = new BooleanValueType(attribute, {isOptional: true});

    expect(type.toString()).toBe('boolean?');

    expect(() => type.checkValue(true, attribute)).not.toThrow();
    expect(() => type.checkValue(false, attribute)).not.toThrow();
    expect(() => type.checkValue(1, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'boolean?', received type: 'number')"
    );
    expect(() => type.checkValue(undefined, attribute)).not.toThrow();
  });

  test('NumberValueType', async () => {
    let type = new NumberValueType(attribute);

    expect(isNumberValueTypeInstance(type)).toBe(true);

    expect(type.toString()).toBe('number');

    expect(() => type.checkValue(1, attribute)).not.toThrow();
    expect(() => type.checkValue('a', attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'number', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'number', received type: 'undefined')"
    );

    type = new NumberValueType(attribute, {isOptional: true});

    expect(type.toString()).toBe('number?');

    expect(() => type.checkValue(1, attribute)).not.toThrow();
    expect(() => type.checkValue('a', attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'number?', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, attribute)).not.toThrow();
  });

  test('StringValueType', async () => {
    let type = new StringValueType(attribute);

    expect(isStringValueTypeInstance(type)).toBe(true);

    expect(type.toString()).toBe('string');

    expect(() => type.checkValue('a', attribute)).not.toThrow();
    expect(() => type.checkValue(1, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'string', received type: 'number')"
    );
    expect(() => type.checkValue(undefined, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'string', received type: 'undefined')"
    );

    type = new StringValueType(attribute, {isOptional: true});

    expect(type.toString()).toBe('string?');

    expect(() => type.checkValue('a', attribute)).not.toThrow();
    expect(() => type.checkValue(1, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'string?', received type: 'number')"
    );
    expect(() => type.checkValue(undefined, attribute)).not.toThrow();
  });

  test('ObjectValueType', async () => {
    let type = new ObjectValueType(attribute);

    expect(isObjectValueTypeInstance(type)).toBe(true);

    class Movie extends Component {}

    const movie = new Movie();

    expect(type.toString()).toBe('object');

    expect(() => type.checkValue({}, attribute)).not.toThrow();
    expect(() => type.checkValue({title: 'Inception'}, attribute)).not.toThrow();
    expect(() => type.checkValue('a', attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'object', received type: 'string')"
    );
    expect(() => type.checkValue(movie, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'object', received type: 'Movie')"
    );
    expect(() => type.checkValue(undefined, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'object', received type: 'undefined')"
    );

    type = new ObjectValueType(attribute, {isOptional: true});

    expect(type.toString()).toBe('object?');

    expect(() => type.checkValue({}, attribute)).not.toThrow();
    expect(() => type.checkValue({title: 'Inception'}, attribute)).not.toThrow();
    expect(() => type.checkValue(movie, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'object?', received type: 'Movie')"
    );
    expect(() => type.checkValue('a', attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'object?', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, attribute)).not.toThrow();
  });

  test('DateValueType', async () => {
    let type = new DateValueType(attribute);

    expect(isDateValueTypeInstance(type)).toBe(true);

    expect(type.toString()).toBe('Date');

    expect(() => type.checkValue(new Date(), attribute)).not.toThrow();
    expect(() => type.checkValue('a', attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'Date', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'Date', received type: 'undefined')"
    );

    type = new DateValueType(attribute, {isOptional: true});

    expect(type.toString()).toBe('Date?');

    expect(() => type.checkValue(new Date(), attribute)).not.toThrow();
    expect(() => type.checkValue('a', attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'Date?', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, attribute)).not.toThrow();
  });

  test('RegExpValueType', async () => {
    let type = new RegExpValueType(attribute);

    expect(isRegExpValueTypeInstance(type)).toBe(true);

    expect(type.toString()).toBe('RegExp');

    expect(() => type.checkValue(/abc/, attribute)).not.toThrow();
    expect(() => type.checkValue('a', attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'RegExp', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'RegExp', received type: 'undefined')"
    );

    type = new RegExpValueType(attribute, {isOptional: true});

    expect(type.toString()).toBe('RegExp?');

    expect(() => type.checkValue(/abc/, attribute)).not.toThrow();
    expect(() => type.checkValue('a', attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'RegExp?', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, attribute)).not.toThrow();
  });

  test('ArrayValueType', async () => {
    let itemType = new NumberValueType(attribute);
    let type = new ArrayValueType(itemType, attribute);

    expect(isArrayValueTypeInstance(type)).toBe(true);

    expect(type.toString()).toBe('number[]');

    expect(() => type.checkValue([], attribute)).not.toThrow();
    expect(() => type.checkValue([1], attribute)).not.toThrow();
    // @ts-expect-error
    expect(() => type.checkValue(1, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'number[]', received type: 'number')"
    );
    expect(() => type.checkValue(['a'], attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'number', received type: 'string')"
    );
    // @ts-expect-error
    expect(() => type.checkValue(undefined, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'number[]', received type: 'undefined')"
    );
    expect(() => type.checkValue([undefined], attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'number', received type: 'undefined')"
    );
    expect(() => type.checkValue([1, undefined], attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'number', received type: 'undefined')"
    );
    expect(() => type.checkValue([undefined, 1], attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'number', received type: 'undefined')"
    );

    itemType = new NumberValueType(attribute, {isOptional: true});
    type = new ArrayValueType(itemType, attribute, {isOptional: true});

    expect(type.toString()).toBe('number?[]?');

    expect(() => type.checkValue([], attribute)).not.toThrow();
    expect(() => type.checkValue([1], attribute)).not.toThrow();
    // @ts-expect-error
    expect(() => type.checkValue(1, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'number?[]?', received type: 'number')"
    );
    expect(() => type.checkValue(['a'], attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'TestComponent.prototype.testAttribute', expected type: 'number?', received type: 'string')"
    );
    // @ts-expect-error
    expect(() => type.checkValue(undefined, attribute)).not.toThrow();
    expect(() => type.checkValue([undefined], attribute)).not.toThrow();
    expect(() => type.checkValue([1, undefined], attribute)).not.toThrow();
    expect(() => type.checkValue([undefined, 1], attribute)).not.toThrow();
  });

  test('ComponentValueType', async () => {
    class Movie extends Component {}

    class Actor extends Component {}

    class App extends Component {
      @provide() static Movie = Movie;
      @provide() static Actor = Actor;
    }

    const attribute = new Attribute('testAttribute', App);

    const movie = new Movie();
    const actor = new Actor();

    // Component class value types

    let type = new ComponentValueType('typeof Movie', attribute);

    expect(isComponentValueTypeInstance(type)).toBe(true);

    expect(type.toString()).toBe('typeof Movie');

    expect(() => type.checkValue(Movie, attribute)).not.toThrow();
    expect(() => type.checkValue(Actor, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'App.testAttribute', expected type: 'typeof Movie', received type: 'typeof Actor')"
    );
    expect(() => type.checkValue(movie, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'App.testAttribute', expected type: 'typeof Movie', received type: 'Movie')"
    );
    expect(() => type.checkValue({}, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'App.testAttribute', expected type: 'typeof Movie', received type: 'object')"
    );
    expect(() => type.checkValue(undefined, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'App.testAttribute', expected type: 'typeof Movie', received type: 'undefined')"
    );

    type = new ComponentValueType('typeof Movie', attribute, {isOptional: true});

    expect(type.toString()).toBe('typeof Movie?');

    expect(() => type.checkValue(Movie, attribute)).not.toThrow();
    expect(() => type.checkValue(Actor, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'App.testAttribute', expected type: 'typeof Movie?', received type: 'typeof Actor')"
    );
    expect(() => type.checkValue(movie, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'App.testAttribute', expected type: 'typeof Movie?', received type: 'Movie')"
    );
    expect(() => type.checkValue({}, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'App.testAttribute', expected type: 'typeof Movie?', received type: 'object')"
    );
    expect(() => type.checkValue(undefined, attribute)).not.toThrow();

    // Component instance value types

    type = new ComponentValueType('Movie', attribute);

    expect(isComponentValueTypeInstance(type)).toBe(true);

    expect(type.toString()).toBe('Movie');

    expect(() => type.checkValue(movie, attribute)).not.toThrow();
    expect(() => type.checkValue(actor, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'App.testAttribute', expected type: 'Movie', received type: 'Actor')"
    );
    expect(() => type.checkValue(Movie, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'App.testAttribute', expected type: 'Movie', received type: 'typeof Movie')"
    );
    expect(() => type.checkValue({}, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'App.testAttribute', expected type: 'Movie', received type: 'object')"
    );
    expect(() => type.checkValue(undefined, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'App.testAttribute', expected type: 'Movie', received type: 'undefined')"
    );

    type = new ComponentValueType('Movie', attribute, {isOptional: true});

    expect(type.toString()).toBe('Movie?');

    expect(() => type.checkValue(movie, attribute)).not.toThrow();
    expect(() => type.checkValue(actor, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'App.testAttribute', expected type: 'Movie?', received type: 'Actor')"
    );
    expect(() => type.checkValue(Movie, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'App.testAttribute', expected type: 'Movie?', received type: 'typeof Movie')"
    );
    expect(() => type.checkValue({}, attribute)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'App.testAttribute', expected type: 'Movie?', received type: 'object')"
    );
    expect(() => type.checkValue(undefined, attribute)).not.toThrow();
  });
});

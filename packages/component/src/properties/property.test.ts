import {Component} from '../component';
import {Property, PropertyOperationSetting} from './property';

describe('Property', () => {
  test('Creation', async () => {
    class Movie extends Component {}

    // @ts-expect-error
    expect(() => new Property()).toThrow(
      "Expected a string, but received a value of type 'undefined'"
    );

    // @ts-expect-error
    expect(() => new Property('title')).toThrow(
      "Expected a component class or instance, but received a value of type 'undefined'"
    );

    // @ts-expect-error
    expect(() => new Property('title', {})).toThrow(
      "Expected a component class or instance, but received a value of type 'object'"
    );

    // @ts-expect-error
    expect(() => new Property('title', Movie, {unknownOption: 123})).toThrow(
      "Did not expect the option 'unknownOption' to exist"
    );

    const property = new Property('title', Movie.prototype);

    expect(Property.isProperty(property)).toBe(true);
    expect(property.getName()).toBe('title');
    expect(property.getParent()).toBe(Movie.prototype);
  });

  test('Exposure', async () => {
    class Movie extends Component {}

    expect(new Property('find', Movie).getExposure()).toBeUndefined();

    expect(new Property('find', Movie, {exposure: {}}).getExposure()).toBeUndefined();

    expect(
      new Property('find', Movie, {exposure: {call: undefined}}).getExposure()
    ).toBeUndefined();

    expect(new Property('find', Movie, {exposure: {call: true}}).getExposure()).toStrictEqual({
      call: true
    });

    expect(() => new Property('find', Movie, {exposure: {call: false}})).toThrow(
      'The specified property operation setting (false) is invalid'
    );

    expect(() => new Property('find', Movie, {exposure: {call: 'admin'}})).toThrow(
      'The specified property operation setting ("admin") is invalid'
    );

    class Film extends Component {
      static normalizePropertyOperationSetting(
        setting: PropertyOperationSetting,
        {throwIfInvalid = true} = {}
      ) {
        const normalizedSetting = super.normalizePropertyOperationSetting(setting, {
          throwIfInvalid: false
        });

        if (normalizedSetting !== undefined) {
          return normalizedSetting;
        }

        if (typeof setting === 'string') {
          return setting;
        }

        if (throwIfInvalid) {
          throw new Error(
            `The specified property operation setting (${JSON.stringify(setting)}) is invalid`
          );
        }

        return undefined;
      }
    }

    expect(new Property('find', Film, {exposure: {call: true}}).getExposure()).toStrictEqual({
      call: true
    });

    expect(new Property('find', Film, {exposure: {call: 'admin'}}).getExposure()).toStrictEqual({
      call: 'admin'
    });

    expect(() => new Property('find', Film, {exposure: {call: false}})).toThrow(
      'The specified property operation setting (false) is invalid'
    );
  });

  test('Forking', async () => {
    class Movie extends Component {}

    const property = new Property('title', Movie.prototype);

    expect(property.getName()).toBe('title');
    expect(property.getParent()).toBe(Movie.prototype);

    const movie = Object.create(Movie.prototype);
    const propertyFork = property.fork(movie);

    expect(propertyFork.getName()).toBe('title');
    expect(propertyFork.getParent()).toBe(movie);
  });

  test('Introspection', async () => {
    class Movie extends Component {
      static normalizePropertyOperationSetting(
        setting: PropertyOperationSetting,
        {throwIfInvalid = true} = {}
      ) {
        const normalizedSetting = super.normalizePropertyOperationSetting(setting, {
          throwIfInvalid: false
        });

        if (normalizedSetting !== undefined) {
          return normalizedSetting;
        }

        if (typeof setting === 'string') {
          return setting;
        }

        if (throwIfInvalid) {
          throw new Error(
            `The specified property operation setting (${JSON.stringify(setting)}) is invalid`
          );
        }

        return undefined;
      }
    }

    expect(new Property('title', Movie.prototype).introspect()).toBeUndefined();

    expect(
      new Property('title', Movie.prototype, {exposure: {get: true}}).introspect()
    ).toStrictEqual({name: 'title', type: 'Property', exposure: {get: true}});

    expect(
      new Property('title', Movie.prototype, {exposure: {get: true, set: 'admin'}}).introspect()
    ).toStrictEqual({name: 'title', type: 'Property', exposure: {get: true, set: true}});
  });

  test('Unintrospection', async () => {
    expect(
      Property.unintrospect({name: 'title', type: 'Property', exposure: {get: true, set: true}})
    ).toStrictEqual({
      name: 'title',
      options: {exposure: {get: true, set: true}}
    });
  });
});

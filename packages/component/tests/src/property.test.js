import {Component, Property, isProperty} from '../../..';

describe('Property', () => {
  test('Creation', async () => {
    class Movie extends Component() {}

    expect(() => new Property()).toThrow(
      'Expected `name` to be of type `string` but received type `undefined`'
    );

    expect(() => new Property('title')).toThrow(
      'Expected `parent` to be of type `object` but received type `undefined`'
    );

    expect(() => new Property('title', Movie, {unknownOption: 123})).toThrow(
      'Did not expect property `unknownOption` to exist, got `123` in object `options`'
    );

    const property = new Property('title', Movie.prototype);

    expect(isProperty(property)).toBe(true);
    expect(property.getName()).toBe('title');
    expect(property.getParent()).toBe(Movie.prototype);
  });

  test('Exposure', async () => {
    class Movie extends Component() {}

    expect(new Property('find', Movie).getExposure()).toBeUndefined();

    expect(new Property('find', Movie, {exposure: {}}).getExposure()).toBeUndefined();

    expect(
      new Property('find', Movie, {exposure: {call: undefined}}).getExposure()
    ).toBeUndefined();

    expect(new Property('find', Movie, {exposure: {call: true}}).getExposure()).toStrictEqual({
      call: true
    });

    expect(() => new Property('find', Movie, {exposure: {call: false}})).toThrow(
      'Invalid property operation setting: false'
    );

    expect(() => new Property('find', Movie, {exposure: {call: 'admin'}})).toThrow(
      'Invalid property operation setting: "admin"'
    );

    class Film extends Component() {
      static normalizePropertyOperationSetting(setting, {throwIfInvalid = true} = {}) {
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
          throw new Error(`Invalid property operation setting: ${JSON.stringify(setting)}`);
        }
      }
    }

    expect(new Property('find', Film, {exposure: {call: true}}).getExposure()).toStrictEqual({
      call: true
    });

    expect(new Property('find', Film, {exposure: {call: 'admin'}}).getExposure()).toStrictEqual({
      call: 'admin'
    });

    expect(() => new Property('find', Film, {exposure: {call: false}})).toThrow(
      'Invalid property operation setting: false'
    );
  });

  test('Forking', async () => {
    class Movie extends Component() {}

    const property = new Property('title', Movie.prototype);

    expect(property.getName()).toBe('title');
    expect(property.getParent()).toBe(Movie.prototype);

    const movie = Object.create(Movie.prototype);
    const forkedProperty = property.fork(movie);

    expect(forkedProperty.getName()).toBe('title');
    expect(forkedProperty.getParent()).toBe(movie);
  });

  test('Introspection', async () => {
    class Movie extends Component() {
      normalizePropertyOperationSetting(setting, {throwIfInvalid = true} = {}) {
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
          throw new Error(`Invalid property operation setting: ${JSON.stringify(setting)}`);
        }
      }
    }

    expect(new Property('title', Movie.prototype).introspect()).toBeUndefined();

    expect(
      new Property('title', Movie.prototype, {exposure: {get: true}}).introspect()
    ).toStrictEqual({name: 'title', type: 'property', exposure: {get: true}});

    expect(
      new Property('title', Movie.prototype, {exposure: {get: true, set: 'admin'}}).introspect()
    ).toStrictEqual({name: 'title', type: 'property', exposure: {get: true, set: true}});
  });
});

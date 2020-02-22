import {Model, Field, isField, NumberType} from '../../..';

describe('Field', () => {
  test('Creation', async () => {
    class Movie extends Model() {}

    const field = new Field('limit', Movie, {valueType: 'number'});

    expect(isField(field)).toBe(true);
    expect(field.getName()).toBe('limit');
    expect(field.getParent()).toBe(Movie);
    expect(field.getValueType()).toBeInstanceOf(NumberType);
  });

  test('Value', async () => {
    class Movie extends Model() {}

    const movie = new Movie();

    const field = new Field('title', movie, {valueType: 'string'});

    expect(field.isActive()).toBe(false);
    expect(() => field.getValue()).toThrow(
      "Cannot get the value from the 'title' field which is inactive"
    );
    expect(field.getValue({throwIfInactive: false})).toBeUndefined();

    field.setValue('Inception');

    expect(field.isActive()).toBe(true);
    expect(field.getValue()).toBe('Inception');

    expect(() => field.setValue(123)).toThrow(
      "Cannot assign a value of an unexpected type to the field 'title' (expected type: 'string', received type: 'number')"
    );
    expect(() => field.setValue(undefined)).toThrow(
      "Cannot assign a value of an unexpected type to the field 'title' (expected type: 'string', received type: 'undefined')"
    );
  });

  test('Observability', async () => {
    class Movie extends Model() {}

    const movie = new Movie();

    const movieObserver = jest.fn();
    movie.addObserver(movieObserver);

    const title = new Field('title', movie, {valueType: 'string'});

    const titleObserver = jest.fn();
    title.addObserver(titleObserver);

    expect(titleObserver).toHaveBeenCalledTimes(0);
    expect(movieObserver).toHaveBeenCalledTimes(0);

    title.setValue('Inception');

    expect(titleObserver).toHaveBeenCalledTimes(1);
    expect(movieObserver).toHaveBeenCalledTimes(1);

    title.setValue('Inception 2');

    expect(titleObserver).toHaveBeenCalledTimes(2);
    expect(movieObserver).toHaveBeenCalledTimes(2);

    title.setValue('Inception 2');

    // Assigning the same value should not call the observers
    expect(titleObserver).toHaveBeenCalledTimes(2);
    expect(movieObserver).toHaveBeenCalledTimes(2);

    const tags = new Field('title', movie, {valueType: '[string]'});

    const tagsObserver = jest.fn();
    tags.addObserver(tagsObserver);

    expect(tagsObserver).toHaveBeenCalledTimes(0);
    expect(movieObserver).toHaveBeenCalledTimes(2);

    tags.setValue(['drama', 'action']);

    expect(tagsObserver).toHaveBeenCalledTimes(1);
    expect(movieObserver).toHaveBeenCalledTimes(3);

    const tagArray = tags.getValue();

    tagArray[0] = 'Drama';

    expect(tagsObserver).toHaveBeenCalledTimes(2);
    expect(movieObserver).toHaveBeenCalledTimes(4);

    tagArray[0] = 'Drama';

    // Assigning the same value should not call the observers
    expect(tagsObserver).toHaveBeenCalledTimes(2);
    expect(movieObserver).toHaveBeenCalledTimes(4);

    tags.setValue(['Drama', 'Action']);

    expect(tagsObserver).toHaveBeenCalledTimes(3);
    expect(movieObserver).toHaveBeenCalledTimes(5);

    const newTagArray = tags.getValue();

    newTagArray[0] = 'drama';

    expect(tagsObserver).toHaveBeenCalledTimes(4);
    expect(movieObserver).toHaveBeenCalledTimes(6);

    tagArray[0] = 'DRAMA';

    // Modifying the previous array should not call the observers
    expect(tagsObserver).toHaveBeenCalledTimes(4);
    expect(movieObserver).toHaveBeenCalledTimes(6);
  });

  test.skip('Introspection', async () => {
    class Movie extends Model() {}

    expect(new Field('limit', Movie, {exposure: {get: true}}).introspect()).toStrictEqual({
      name: 'limit',
      type: 'field',
      exposure: {get: true}
    });

    expect(
      new Field('limit', Movie, {value: 100, exposure: {get: true}}).introspect()
    ).toStrictEqual({name: 'limit', type: 'field', value: 100, exposure: {get: true}});

    const defaultTitle = function() {
      return '';
    };
    expect(
      new Field('title', Movie.prototype, {
        default: defaultTitle,
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'title',
      type: 'field',
      default: defaultTitle,
      exposure: {get: true}
    });
  });
});

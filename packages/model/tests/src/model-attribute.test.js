import {Model, ModelAttribute, isModelAttribute, NumberType, validators} from '../../..';

describe('ModelAttribute', () => {
  test('Creation', async () => {
    class Movie extends Model {}

    const modelAttribute = new ModelAttribute('limit', Movie, {type: 'number'});

    expect(isModelAttribute(modelAttribute)).toBe(true);
    expect(modelAttribute.getName()).toBe('limit');
    expect(modelAttribute.getParent()).toBe(Movie);
    expect(modelAttribute.getType()).toBeInstanceOf(NumberType);
  });

  test('Value', async () => {
    class Movie extends Model {}

    const movie = new Movie();

    const modelAttribute = new ModelAttribute('title', movie, {type: 'string'});

    expect(modelAttribute.isSet()).toBe(false);
    expect(() => modelAttribute.getValue()).toThrow(
      "Cannot get the value of an unset attribute (model name: 'movie', attribute name: 'title')"
    );
    expect(modelAttribute.getValue({throwIfUnset: false})).toBeUndefined();

    modelAttribute.setValue('Inception');

    expect(modelAttribute.isSet()).toBe(true);
    expect(modelAttribute.getValue()).toBe('Inception');

    expect(() => modelAttribute.setValue(123)).toThrow(
      "Cannot assign a value of an unexpected type (model name: 'movie', attribute name: 'title', expected type: 'string', received type: 'number')"
    );
    expect(() => modelAttribute.setValue(undefined)).toThrow(
      "Cannot assign a value of an unexpected type (model name: 'movie', attribute name: 'title', expected type: 'string', received type: 'undefined')"
    );

    modelAttribute.unsetValue();

    expect(modelAttribute.isSet()).toBe(false);
  });

  test('Validation', async () => {
    class Movie extends Model {}

    const movie = new Movie();

    const notEmpty = validators.notEmpty();
    const modelAttribute = new ModelAttribute('title', movie, {
      type: 'string?',
      validators: [notEmpty]
    });

    expect(() => modelAttribute.runValidators()).toThrow(
      "Cannot run the validators of an unset attribute (model name: 'movie', attribute name: 'title')"
    );

    modelAttribute.setValue('Inception');

    expect(() => modelAttribute.validate()).not.toThrow();
    expect(modelAttribute.isValid()).toBe(true);
    expect(modelAttribute.runValidators()).toEqual([]);

    modelAttribute.setValue('');

    expect(() => modelAttribute.validate()).toThrow(
      "The following error(s) occurred while validating the attribute 'title': The validator `notEmpty()` failed (path: '')"
    );
    expect(modelAttribute.isValid()).toBe(false);
    expect(modelAttribute.runValidators()).toEqual([{validator: notEmpty, path: ''}]);

    modelAttribute.setValue(undefined);

    expect(() => modelAttribute.validate()).not.toThrow();
    expect(modelAttribute.isValid()).toBe(true);
    expect(modelAttribute.runValidators()).toEqual([]);
  });

  test('Observability', async () => {
    class Movie extends Model {}

    const movie = new Movie();

    const movieObserver = jest.fn();
    movie.addObserver(movieObserver);

    const title = new ModelAttribute('title', movie, {type: 'string'});

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

    const tags = new ModelAttribute('title', movie, {type: '[string]'});

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

    tags.unsetValue();

    expect(tagsObserver).toHaveBeenCalledTimes(5);
    expect(movieObserver).toHaveBeenCalledTimes(7);

    tags.unsetValue();

    // Calling unset again should not call the observers
    expect(tagsObserver).toHaveBeenCalledTimes(5);
    expect(movieObserver).toHaveBeenCalledTimes(7);

    newTagArray[0] = 'drama';

    // Modifying the detached array should not call the observers
    expect(tagsObserver).toHaveBeenCalledTimes(5);
    expect(movieObserver).toHaveBeenCalledTimes(7);
  });

  test('Introspection', async () => {
    class Movie extends Model {}

    expect(
      new ModelAttribute('limit', Movie, {
        type: 'number',
        value: 100,
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'limit',
      type: 'modelAttribute',
      valueType: 'number',
      value: 100,
      exposure: {get: true}
    });

    const notEmpty = validators.notEmpty();

    expect(
      new ModelAttribute('title', Movie.prototype, {
        type: 'string?',
        validators: [notEmpty],
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'title',
      type: 'modelAttribute',
      valueType: 'string?',
      validators: [
        {
          name: 'notEmpty',
          function: notEmpty.getFunction(),
          message: 'The validator `notEmpty()` failed'
        }
      ],
      exposure: {get: true}
    });

    expect(
      new ModelAttribute('tags', Movie.prototype, {
        type: '[string]',
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'tags',
      type: 'modelAttribute',
      valueType: '[string]',
      exposure: {get: true}
    });

    expect(
      new ModelAttribute('tags', Movie.prototype, {
        type: '[string]',
        items: {validators: [notEmpty]},
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'tags',
      type: 'modelAttribute',
      valueType: '[string]',
      items: {
        validators: [
          {
            name: 'notEmpty',
            function: notEmpty.getFunction(),
            message: 'The validator `notEmpty()` failed'
          }
        ]
      },
      exposure: {get: true}
    });

    expect(
      new ModelAttribute('tags', Movie.prototype, {
        type: '[[string]]',
        items: {items: {validators: [notEmpty]}},
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'tags',
      type: 'modelAttribute',
      valueType: '[[string]]',
      items: {
        items: {
          validators: [
            {
              name: 'notEmpty',
              function: notEmpty.getFunction(),
              message: 'The validator `notEmpty()` failed'
            }
          ]
        }
      },
      exposure: {get: true}
    });
  });

  test('Unintrospection', async () => {
    expect(
      ModelAttribute.unintrospect({
        name: 'limit',
        valueType: 'number',
        value: 100,
        exposure: {get: true}
      })
    ).toEqual({
      name: 'limit',
      options: {type: 'number', value: 100, exposure: {get: true}}
    });

    const notEmptyFunction = validators.notEmpty().getFunction();

    let {name, options} = ModelAttribute.unintrospect({
      name: 'title',
      valueType: 'string?',
      validators: [
        {
          name: 'notEmpty',
          function: notEmptyFunction,
          message: 'The validator `notEmpty()` failed'
        }
      ],
      exposure: {get: true}
    });

    expect(name).toBe('title');
    expect(options.type).toBe('string?');
    expect(options.validators).toHaveLength(1);
    expect(options.validators[0].getName()).toBe('notEmpty');
    expect(options.validators[0].getFunction()).toBe(notEmptyFunction);
    expect(options.validators[0].getMessage()).toBe('The validator `notEmpty()` failed');
    expect(options.exposure).toEqual({get: true});

    ({name, options} = ModelAttribute.unintrospect({
      name: 'tags',
      valueType: '[string]',
      items: {
        validators: [
          {
            name: 'notEmpty',
            function: notEmptyFunction,
            message: 'The validator `notEmpty()` failed'
          }
        ]
      },
      exposure: {get: true}
    }));

    expect(name).toBe('tags');
    expect(options.type).toBe('[string]');
    expect(options.validators).toBeUndefined();
    expect(options.items.validators).toHaveLength(1);
    expect(options.items.validators[0].getName()).toBe('notEmpty');
    expect(options.items.validators[0].getFunction()).toBe(notEmptyFunction);
    expect(options.items.validators[0].getMessage()).toBe('The validator `notEmpty()` failed');
    expect(options.exposure).toEqual({get: true});

    ({name, options} = ModelAttribute.unintrospect({
      name: 'tags',
      valueType: '[[string]]',
      items: {
        items: {
          validators: [
            {
              name: 'notEmpty',
              function: notEmptyFunction,
              message: 'The validator `notEmpty()` failed'
            }
          ]
        }
      },
      exposure: {get: true}
    }));

    expect(name).toBe('tags');
    expect(options.type).toBe('[[string]]');
    expect(options.validators).toBeUndefined();
    expect(options.items.validators).toBeUndefined();
    expect(options.items.items.validators).toHaveLength(1);
    expect(options.items.items.validators[0].getName()).toBe('notEmpty');
    expect(options.items.items.validators[0].getFunction()).toBe(notEmptyFunction);
    expect(options.items.items.validators[0].getMessage()).toBe(
      'The validator `notEmpty()` failed'
    );
    expect(options.exposure).toEqual({get: true});
  });
});

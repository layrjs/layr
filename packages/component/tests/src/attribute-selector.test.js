import {AttributeSelector} from '../../..';

describe('AttributeSelector', () => {
  test('fromNames()', () => {
    expect(AttributeSelector.fromNames([])).toStrictEqual({});
    expect(AttributeSelector.fromNames(['title'])).toStrictEqual({title: true});
    expect(AttributeSelector.fromNames(['title', 'country'])).toStrictEqual({
      title: true,
      country: true
    });
  });

  test('get()', () => {
    expect(AttributeSelector.get(false, 'title')).toBe(false);
    expect(AttributeSelector.get(true, 'title')).toBe(true);

    const attributeSelector = {title: true, director: {name: true}};

    expect(AttributeSelector.get(attributeSelector, 'title')).toBe(true);
    expect(AttributeSelector.get(attributeSelector, 'country')).toBe(false);
    expect(AttributeSelector.get(attributeSelector, 'director')).toStrictEqual({name: true});
  });

  test('set()', () => {
    expect(AttributeSelector.set(false, 'title', false)).toBe(false);
    expect(AttributeSelector.set(false, 'title', true)).toBe(false);
    expect(AttributeSelector.set(true, 'title', false)).toBe(true);
    expect(AttributeSelector.set(true, 'title', true)).toBe(true);
    expect(AttributeSelector.set({}, 'title', false)).toStrictEqual({});
    expect(AttributeSelector.set({}, 'title', true)).toStrictEqual({title: true});
    expect(AttributeSelector.set({title: true}, 'title', false)).toStrictEqual({});
    expect(AttributeSelector.set({title: true}, 'title', true)).toStrictEqual({title: true});
    expect(AttributeSelector.set({title: true}, 'director', {})).toStrictEqual({
      title: true,
      director: {}
    });
    expect(AttributeSelector.set({title: true}, 'director', {name: true})).toStrictEqual({
      title: true,
      director: {name: true}
    });
  });

  test('clone()', () => {
    const attributeSelector = {title: true, director: {name: true}};
    const clonedAttributeSelector = AttributeSelector.clone(attributeSelector);

    expect(clonedAttributeSelector).not.toBe(attributeSelector);
    expect(AttributeSelector.get(clonedAttributeSelector, 'director')).not.toBe(
      AttributeSelector.get(attributeSelector, 'director')
    );
    expect(clonedAttributeSelector).toStrictEqual(attributeSelector);
  });

  test('isEqual()', () => {
    expect(AttributeSelector.isEqual(false, false)).toBe(true);
    expect(AttributeSelector.isEqual(true, true)).toBe(true);
    expect(AttributeSelector.isEqual({}, {})).toBe(true);
    expect(AttributeSelector.isEqual({title: true}, {title: true})).toBe(true);
    expect(
      AttributeSelector.isEqual({title: true, country: true}, {title: true, country: true})
    ).toBe(true);
    expect(
      AttributeSelector.isEqual(
        {title: true, director: {name: true}},
        {title: true, director: {name: true}}
      )
    ).toBe(true);

    expect(AttributeSelector.isEqual(false, true)).not.toBe(true);
    expect(AttributeSelector.isEqual(true, false)).not.toBe(true);
    expect(AttributeSelector.isEqual(false, {})).not.toBe(true);
    expect(AttributeSelector.isEqual({}, false)).not.toBe(true);
    expect(AttributeSelector.isEqual(true, {})).not.toBe(true);
    expect(AttributeSelector.isEqual({}, true)).not.toBe(true);
    expect(AttributeSelector.isEqual({title: true}, {})).not.toBe(true);
    expect(AttributeSelector.isEqual({}, {title: true})).not.toBe(true);
    expect(AttributeSelector.isEqual({title: true, country: true}, {title: true})).not.toBe(true);
    expect(AttributeSelector.isEqual({title: true}, {title: true, country: true})).not.toBe(true);
    expect(
      AttributeSelector.isEqual(
        {title: true, director: {name: true}},
        {title: true, director: {country: true}}
      )
    ).not.toBe(true);
  });

  test('includes()', () => {
    expect(AttributeSelector.includes(false, false)).toBe(true);
    expect(AttributeSelector.includes(true, false)).toBe(true);
    expect(AttributeSelector.includes(true, true)).toBe(true);
    expect(AttributeSelector.includes(true, {})).toBe(true);
    expect(AttributeSelector.includes(true, {title: true})).toBe(true);
    expect(AttributeSelector.includes({}, false)).toBe(true);
    expect(AttributeSelector.includes({}, {})).toBe(true);
    expect(AttributeSelector.includes({title: true}, false)).toBe(true);
    expect(AttributeSelector.includes({title: true}, {})).toBe(true);
    expect(AttributeSelector.includes({title: true}, {title: true})).toBe(true);
    expect(AttributeSelector.includes({title: true, country: true}, {title: true})).toBe(true);
    expect(AttributeSelector.includes({title: true, director: {name: true}}, {title: true})).toBe(
      true
    );
    expect(
      AttributeSelector.includes({title: true, director: {name: true}}, {title: true, director: {}})
    ).toBe(true);
    expect(
      AttributeSelector.includes(
        {title: true, director: {name: true}},
        {title: true, director: {name: true}}
      )
    ).toBe(true);

    expect(AttributeSelector.includes(false, true)).not.toBe(true);
    expect(AttributeSelector.includes(false, {})).not.toBe(true);
    expect(AttributeSelector.includes(false, {title: true})).not.toBe(true);
    expect(AttributeSelector.includes({}, true)).not.toBe(true);
    expect(AttributeSelector.includes({title: true}, true)).not.toBe(true);
    expect(AttributeSelector.includes({}, {title: true})).not.toBe(true);
    expect(AttributeSelector.includes({title: true}, {country: true})).not.toBe(true);
    expect(AttributeSelector.includes({title: true}, {title: true, country: true})).not.toBe(true);
    expect(AttributeSelector.includes({title: true}, {title: true, director: {}})).not.toBe(true);
    expect(
      AttributeSelector.includes({title: true, director: {}}, {title: true, director: {name: true}})
    ).not.toBe(true);
    expect(
      AttributeSelector.includes(
        {title: true, director: {name: true}},
        {title: true, director: {country: true}}
      )
    ).not.toBe(true);
  });

  test('add()', () => {
    expect(AttributeSelector.add(false, false)).toBe(false);
    expect(AttributeSelector.add(false, true)).toBe(true);
    expect(AttributeSelector.add(true, false)).toBe(true);
    expect(AttributeSelector.add(true, true)).toBe(true);
    expect(AttributeSelector.add(true, {})).toBe(true);
    expect(AttributeSelector.add(true, {title: true})).toBe(true);
    expect(AttributeSelector.add(false, {})).toStrictEqual({});
    expect(AttributeSelector.add(false, {title: true})).toStrictEqual({title: true});
    expect(AttributeSelector.add({}, false)).toStrictEqual({});
    expect(AttributeSelector.add({}, true)).toBe(true);
    expect(AttributeSelector.add({}, {})).toStrictEqual({});
    expect(AttributeSelector.add({title: true}, false)).toStrictEqual({title: true});
    expect(AttributeSelector.add({title: true}, {})).toStrictEqual({title: true});
    expect(AttributeSelector.add({title: true}, {title: true})).toStrictEqual({title: true});
    expect(AttributeSelector.add({title: true}, {country: true})).toStrictEqual({
      title: true,
      country: true
    });
    expect(
      AttributeSelector.add({title: true, director: {name: true}}, {title: true, director: true})
    ).toStrictEqual({title: true, director: true});
    expect(
      AttributeSelector.add({title: true, director: true}, {title: true, director: {name: true}})
    ).toStrictEqual({title: true, director: true});
    expect(
      AttributeSelector.add(
        {title: true, director: {name: true}},
        {title: true, director: {country: true}}
      )
    ).toStrictEqual({title: true, director: {name: true, country: true}});
  });

  test('remove()', () => {
    expect(AttributeSelector.remove(false, false)).toBe(false);
    expect(AttributeSelector.remove(false, true)).toBe(false);
    expect(AttributeSelector.remove(true, false)).toBe(true);
    expect(AttributeSelector.remove(true, true)).toBe(false);
    expect(() => AttributeSelector.remove(true, {})).toThrow(
      "Cannot remove an 'object' attribute selector from a 'true' attribute selector"
    );
    expect(AttributeSelector.remove(false, {})).toBe(false);
    expect(AttributeSelector.remove({}, false)).toStrictEqual({});
    expect(AttributeSelector.remove({}, true)).toBe(false);
    expect(AttributeSelector.remove({}, {})).toStrictEqual({});
    expect(AttributeSelector.remove({title: true}, {})).toStrictEqual({title: true});
    expect(AttributeSelector.remove({title: true}, {title: false})).toStrictEqual({title: true});
    expect(AttributeSelector.remove({title: true}, {title: true})).toStrictEqual({});
    expect(AttributeSelector.remove({title: true}, {country: true})).toStrictEqual({title: true});
    expect(
      AttributeSelector.remove({title: true, director: {name: true}}, {director: true})
    ).toStrictEqual({
      title: true
    });
    expect(() =>
      AttributeSelector.remove({title: true, director: true}, {title: true, director: {name: true}})
    ).toThrow("Cannot remove an 'object' attribute selector from a 'true' attribute selector");
    expect(
      AttributeSelector.remove(
        {title: true, director: {name: true}},
        {title: true, director: {name: true}}
      )
    ).toStrictEqual({director: {}});
  });

  test('normalize()', () => {
    expect(AttributeSelector.normalize(true)).toBe(true);
    expect(AttributeSelector.normalize(false)).toBe(false);
    expect(AttributeSelector.normalize(undefined)).toBe(false);
    expect(AttributeSelector.normalize({})).toStrictEqual({});
    expect(AttributeSelector.normalize({title: true, director: {name: true}})).toStrictEqual({
      title: true,
      director: {name: true}
    });

    class Movie {}

    expect(() => AttributeSelector.normalize(null)).toThrow(
      "Expected a valid attribute selector, but received a value of type 'null'"
    );
    expect(() => AttributeSelector.normalize(1)).toThrow(
      "Expected a valid attribute selector, but received a value of type 'number'"
    );
    expect(() => AttributeSelector.normalize('a')).toThrow(
      "Expected a valid attribute selector, but received a value of type 'string'"
    );
    expect(() => AttributeSelector.normalize(['a'])).toThrow(
      "Expected a valid attribute selector, but received a value of type 'array'"
    );
    expect(() => AttributeSelector.normalize(() => {})).toThrow(
      "Expected a valid attribute selector, but received a value of type 'function'"
    );
    expect(() => AttributeSelector.normalize(new Date())).toThrow(
      "Expected a valid attribute selector, but received a value of type 'date'"
    );
    expect(() => AttributeSelector.normalize(new Movie())).toThrow(
      "Expected a valid attribute selector, but received a value of type 'movie'"
    );
  });
});

import {FieldMask} from '../../..';

describe('FieldMask', () => {
  test('Basic use', () => {
    let fields = new FieldMask();
    expect(fields.get('title')).toBeInstanceOf(FieldMask);

    fields = new FieldMask(true);
    expect(fields.get('title')).toBeInstanceOf(FieldMask);

    expect(() => new FieldMask(false)).toThrow();

    fields = new FieldMask({});
    expect(fields.get('title')).toBe(false);

    fields = new FieldMask({title: true});
    expect(fields.get('title')).toBeInstanceOf(FieldMask);

    fields = new FieldMask({title: true});
    expect(fields.get('genre')).toBe(false);
  });

  test('Nesting', () => {
    let fields = new FieldMask({director: {fullName: true}});
    expect(fields.get('director')).toBeInstanceOf(FieldMask);
    expect(fields.get('director').get('fullName')).toBeInstanceOf(FieldMask);
    expect(fields.get('director').get('country')).toBe(false);

    fields = new FieldMask({director: {fullName: false}});
    expect(fields.get('director').get('fullName')).toBe(false);

    fields = new FieldMask({director: {}});
    expect(fields.get('director').get('fullName')).toBe(false);

    fields = new FieldMask({director: {fullName: undefined}});
    expect(fields.get('director').get('fullName')).toBe(false);
  });

  test('Arrays', () => {
    const fields = new FieldMask({actors: [{fullName: true}]});
    expect(fields.get('actors')).toBeInstanceOf(FieldMask);
    expect(fields.get('actors').get('fullName')).toBeInstanceOf(FieldMask);
    expect(fields.get('actors').get('country')).toBe(false);
  });

  test('Equality', () => {
    expect(FieldMask.isEqual(undefined, undefined)).toBe(true);
    expect(FieldMask.isEqual(undefined, true)).toBe(true);
    expect(FieldMask.isEqual(true, undefined)).toBe(true);
    expect(FieldMask.isEqual(true, true)).toBe(true);

    expect(FieldMask.isEqual({}, {})).toBe(true);
    expect(FieldMask.isEqual({}, true)).toBe(false);
    expect(FieldMask.isEqual({title: true}, {title: true})).toBe(true);
    expect(FieldMask.isEqual({title: true}, {genre: true})).toBe(false);

    expect(FieldMask.isEqual({director: {fullName: true}}, {director: {fullName: true}})).toBe(
      true
    );
    expect(FieldMask.isEqual({director: {fullName: true}}, {director: {fullName: false}})).toBe(
      false
    );
    expect(FieldMask.isEqual({director: {fullName: true}}, {director: {firstName: true}})).toBe(
      false
    );

    expect(FieldMask.isEqual({actors: [true]}, {actors: []})).toBe(true);
    expect(FieldMask.isEqual({actors: [true]}, {actors: [{}]})).toBe(false);
    expect(FieldMask.isEqual({actors: [true]}, {actors: true})).toBe(true);
  });

  test('Merging', () => {
    expect(FieldMask.isEqual(FieldMask.merge({title: true}, undefined), true)).toBe(true);
    expect(FieldMask.isEqual(FieldMask.merge({title: true}, true), true)).toBe(true);
    expect(FieldMask.isEqual(FieldMask.merge({title: true}, {}), {title: true})).toBe(true);

    expect(
      FieldMask.isEqual(FieldMask.merge({title: true}, {genre: true}), {title: true, genre: true})
    ).toBe(true);
    expect(
      FieldMask.isEqual(FieldMask.merge({genre: true}, {title: true}), {title: true, genre: true})
    ).toBe(true);

    expect(
      FieldMask.isEqual(FieldMask.merge({title: true}, {director: {fullName: true}}), {
        title: true,
        director: {fullName: true}
      })
    ).toBe(true);
    expect(
      FieldMask.isEqual(
        FieldMask.merge({director: {fullName: true}}, {director: {country: true}}),
        {director: {fullName: true, country: true}}
      )
    ).toBe(true);
  });
});

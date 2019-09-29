import {FieldMask} from '../../..';

describe('FieldMask', () => {
  test('Getting', () => {
    let fields = new FieldMask();
    expect(fields.get('title')).toBe(false);

    expect(() => new FieldMask(true)).toThrow();

    fields = new FieldMask({title: true});
    expect(fields.get('title')).toBe(true);

    fields = new FieldMask({title: true});
    expect(fields.get('genre')).toBe(false);
  });

  test('Setting', () => {
    const fields = new FieldMask();

    expect(fields.get('title')).toBe(false);
    fields.set('title', true);
    expect(fields.get('title')).toBe(true);

    expect(fields.get('director')).toBe(false);
    expect(() => fields.set('director', {fullName: true})).toThrow();
    fields.set('director', new FieldMask({fullName: true}));
    expect(FieldMask.isEqual(fields.get('director'), new FieldMask({fullName: true}))).toBe(true);
  });

  test('Nesting', () => {
    let fields = new FieldMask({director: {fullName: true}});
    expect(fields.get('director')).toBeInstanceOf(FieldMask);
    expect(fields.get('director').get('fullName')).toBe(true);
    expect(fields.get('director').get('country')).toBe(false);

    fields = new FieldMask({director: {}});
    expect(fields.get('director').get('fullName')).toBe(false);
  });

  test('Equality', () => {
    expect(FieldMask.isEqual(new FieldMask({}), new FieldMask({}))).toBe(true);
    expect(FieldMask.isEqual(new FieldMask({title: true}), new FieldMask({title: true}))).toBe(
      true
    );
    expect(FieldMask.isEqual(new FieldMask({title: true}), new FieldMask({genre: true}))).toBe(
      false
    );

    expect(
      FieldMask.isEqual(
        new FieldMask({director: {fullName: true}}),
        new FieldMask({director: {fullName: true}})
      )
    ).toBe(true);
    expect(
      FieldMask.isEqual(
        new FieldMask({director: {fullName: true}}),
        new FieldMask({director: {fullName: false}})
      )
    ).toBe(false);
    expect(
      FieldMask.isEqual(
        new FieldMask({director: {fullName: true}}),
        new FieldMask({director: {firstName: true}})
      )
    ).toBe(false);
  });

  test('Inclusion', () => {
    expect(new FieldMask({}).includes(new FieldMask({}))).toBe(true);
    expect(new FieldMask({title: true}).includes(new FieldMask({}))).toBe(true);
    expect(new FieldMask({title: true}).includes(new FieldMask({title: true}))).toBe(true);
    expect(new FieldMask({title: true, genre: true}).includes(new FieldMask({title: true}))).toBe(
      true
    );
    expect(new FieldMask({title: true}).includes(new FieldMask({title: true, genre: true}))).toBe(
      false
    );

    expect(new FieldMask({director: {}}).includes(new FieldMask({director: {}}))).toBe(true);
    expect(
      new FieldMask({director: {fullName: true}}).includes(
        new FieldMask({director: {fullName: true}})
      )
    ).toBe(true);
    expect(
      new FieldMask({director: {fullName: true, age: true}}).includes(
        new FieldMask({director: {fullName: true}})
      )
    ).toBe(true);
    expect(
      new FieldMask({director: {fullName: true}}).includes(
        new FieldMask({director: {fullName: true, age: true}})
      )
    ).toBe(false);
  });

  test('Adding', () => {
    expect(
      FieldMask.isEqual(
        FieldMask.add(new FieldMask({title: true}), new FieldMask({})),
        new FieldMask({title: true})
      )
    ).toBe(true);

    expect(
      FieldMask.isEqual(
        FieldMask.add(new FieldMask({title: true}), new FieldMask({genre: true})),
        new FieldMask({title: true, genre: true})
      )
    ).toBe(true);

    expect(
      FieldMask.isEqual(
        FieldMask.add(new FieldMask({title: true}), new FieldMask({director: {fullName: true}})),
        new FieldMask({
          title: true,
          director: {fullName: true}
        })
      )
    ).toBe(true);

    expect(
      FieldMask.isEqual(
        FieldMask.add(
          new FieldMask({director: {fullName: true}}),
          new FieldMask({director: {country: true}})
        ),
        new FieldMask({director: {fullName: true, country: true}})
      )
    ).toBe(true);
  });

  test('Removing', () => {
    expect(
      FieldMask.isEqual(
        FieldMask.remove(new FieldMask({title: true}), new FieldMask({})),
        new FieldMask({title: true})
      )
    ).toBe(true);

    expect(
      FieldMask.isEqual(
        FieldMask.remove(new FieldMask({}), new FieldMask({title: true})),
        new FieldMask({})
      )
    ).toBe(true);

    expect(
      FieldMask.isEqual(
        FieldMask.remove(new FieldMask({title: true}), new FieldMask({genre: true})),
        new FieldMask({title: true})
      )
    ).toBe(true);

    expect(
      FieldMask.isEqual(
        FieldMask.remove(new FieldMask({title: true}), new FieldMask({title: true})),
        new FieldMask({})
      )
    ).toBe(true);

    expect(
      FieldMask.isEqual(
        FieldMask.remove(new FieldMask({title: true, genre: true}), new FieldMask({genre: true})),
        new FieldMask({title: true})
      )
    ).toBe(true);

    expect(
      FieldMask.isEqual(
        FieldMask.remove(
          new FieldMask({title: true, director: {fullName: true, country: true}}),
          new FieldMask({director: {country: true}})
        ),
        new FieldMask({
          title: true,
          director: {fullName: true}
        })
      )
    ).toBe(true);

    expect(
      FieldMask.isEqual(
        FieldMask.remove(new FieldMask({}), new FieldMask({director: {country: true}})),
        new FieldMask({})
      )
    ).toBe(true);

    expect(
      FieldMask.isEqual(
        FieldMask.remove(new FieldMask({director: {}}), new FieldMask({director: {country: true}})),
        new FieldMask({director: {}})
      )
    ).toBe(true);
  });
});

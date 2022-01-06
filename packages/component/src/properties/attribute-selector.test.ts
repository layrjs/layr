import {Component} from '../component';
import {Attribute} from './attribute';
import {
  createAttributeSelectorFromNames,
  createAttributeSelectorFromAttributes,
  getFromAttributeSelector,
  setWithinAttributeSelector,
  cloneAttributeSelector,
  attributeSelectorsAreEqual,
  attributeSelectorIncludes,
  mergeAttributeSelectors,
  intersectAttributeSelectors,
  removeFromAttributeSelector,
  iterateOverAttributeSelector,
  pickFromAttributeSelector,
  traverseAttributeSelector,
  trimAttributeSelector,
  normalizeAttributeSelector
} from './attribute-selector';
import {attribute} from '../decorators';

describe('AttributeSelector', () => {
  test('createAttributeSelectorFromNames()', () => {
    expect(createAttributeSelectorFromNames([])).toStrictEqual({});
    expect(createAttributeSelectorFromNames(['title'])).toStrictEqual({title: true});
    expect(createAttributeSelectorFromNames(['title', 'country'])).toStrictEqual({
      title: true,
      country: true
    });
  });

  test('createAttributeSelectorFromAttributes()', () => {
    const createAttributes = (names: string[]) =>
      names.map((name) => (({getName: () => name} as unknown) as Attribute));

    expect(createAttributeSelectorFromAttributes(createAttributes([]))).toStrictEqual({});
    expect(createAttributeSelectorFromAttributes(createAttributes(['title']))).toStrictEqual({
      title: true
    });
    expect(
      createAttributeSelectorFromAttributes(createAttributes(['title', 'country']))
    ).toStrictEqual({
      title: true,
      country: true
    });
  });

  test('getFromAttributeSelector()', () => {
    expect(getFromAttributeSelector(false, 'title')).toBe(false);
    expect(getFromAttributeSelector(true, 'title')).toBe(true);

    const attributeSelector = {title: true, director: {name: true}};

    expect(getFromAttributeSelector(attributeSelector, 'title')).toBe(true);
    expect(getFromAttributeSelector(attributeSelector, 'country')).toBe(false);
    expect(getFromAttributeSelector(attributeSelector, 'director')).toStrictEqual({name: true});
  });

  test('setWithinAttributeSelector()', () => {
    expect(setWithinAttributeSelector(false, 'title', false)).toBe(false);
    expect(setWithinAttributeSelector(false, 'title', true)).toBe(false);
    expect(setWithinAttributeSelector(true, 'title', false)).toBe(true);
    expect(setWithinAttributeSelector(true, 'title', true)).toBe(true);
    expect(setWithinAttributeSelector({}, 'title', false)).toStrictEqual({});
    expect(setWithinAttributeSelector({}, 'title', true)).toStrictEqual({title: true});
    expect(setWithinAttributeSelector({title: true}, 'title', false)).toStrictEqual({});
    expect(setWithinAttributeSelector({title: true}, 'title', true)).toStrictEqual({title: true});
    expect(setWithinAttributeSelector({title: true}, 'director', {})).toStrictEqual({
      title: true,
      director: {}
    });
    expect(setWithinAttributeSelector({title: true}, 'director', {name: true})).toStrictEqual({
      title: true,
      director: {name: true}
    });
  });

  test('cloneAttributeSelector()', () => {
    const attributeSelector = {title: true, director: {name: true}};
    const clonedAttributeSelector = cloneAttributeSelector(attributeSelector);

    expect(clonedAttributeSelector).not.toBe(attributeSelector);
    expect(getFromAttributeSelector(clonedAttributeSelector, 'director')).not.toBe(
      getFromAttributeSelector(attributeSelector, 'director')
    );
    expect(clonedAttributeSelector).toStrictEqual(attributeSelector);
  });

  test('attributeSelectorsAreEqual()', () => {
    expect(attributeSelectorsAreEqual(false, false)).toBe(true);
    expect(attributeSelectorsAreEqual(true, true)).toBe(true);
    expect(attributeSelectorsAreEqual({}, {})).toBe(true);
    expect(attributeSelectorsAreEqual({title: true}, {title: true})).toBe(true);
    expect(
      attributeSelectorsAreEqual({title: true, country: true}, {title: true, country: true})
    ).toBe(true);
    expect(
      attributeSelectorsAreEqual(
        {title: true, director: {name: true}},
        {title: true, director: {name: true}}
      )
    ).toBe(true);

    expect(attributeSelectorsAreEqual(false, true)).not.toBe(true);
    expect(attributeSelectorsAreEqual(true, false)).not.toBe(true);
    expect(attributeSelectorsAreEqual(false, {})).not.toBe(true);
    expect(attributeSelectorsAreEqual({}, false)).not.toBe(true);
    expect(attributeSelectorsAreEqual(true, {})).not.toBe(true);
    expect(attributeSelectorsAreEqual({}, true)).not.toBe(true);
    expect(attributeSelectorsAreEqual({title: true}, {})).not.toBe(true);
    expect(attributeSelectorsAreEqual({}, {title: true})).not.toBe(true);
    expect(attributeSelectorsAreEqual({title: true, country: true}, {title: true})).not.toBe(true);
    expect(attributeSelectorsAreEqual({title: true}, {title: true, country: true})).not.toBe(true);
    expect(
      attributeSelectorsAreEqual(
        {title: true, director: {name: true}},
        {title: true, director: {country: true}}
      )
    ).not.toBe(true);
  });

  test('attributeSelectorIncludes()', () => {
    expect(attributeSelectorIncludes(false, false)).toBe(true);
    expect(attributeSelectorIncludes(true, false)).toBe(true);
    expect(attributeSelectorIncludes(true, true)).toBe(true);
    expect(attributeSelectorIncludes(true, {})).toBe(true);
    expect(attributeSelectorIncludes(true, {title: true})).toBe(true);
    expect(attributeSelectorIncludes({}, false)).toBe(true);
    expect(attributeSelectorIncludes({}, {})).toBe(true);
    expect(attributeSelectorIncludes({title: true}, false)).toBe(true);
    expect(attributeSelectorIncludes({title: true}, {})).toBe(true);
    expect(attributeSelectorIncludes({title: true}, {title: true})).toBe(true);
    expect(attributeSelectorIncludes({title: true, country: true}, {title: true})).toBe(true);
    expect(attributeSelectorIncludes({title: true, director: {name: true}}, {title: true})).toBe(
      true
    );
    expect(
      attributeSelectorIncludes({title: true, director: {name: true}}, {title: true, director: {}})
    ).toBe(true);
    expect(
      attributeSelectorIncludes(
        {title: true, director: {name: true}},
        {title: true, director: {name: true}}
      )
    ).toBe(true);

    expect(attributeSelectorIncludes(false, true)).not.toBe(true);
    expect(attributeSelectorIncludes(false, {})).not.toBe(true);
    expect(attributeSelectorIncludes(false, {title: true})).not.toBe(true);
    expect(attributeSelectorIncludes({}, true)).not.toBe(true);
    expect(attributeSelectorIncludes({title: true}, true)).not.toBe(true);
    expect(attributeSelectorIncludes({}, {title: true})).not.toBe(true);
    expect(attributeSelectorIncludes({title: true}, {country: true})).not.toBe(true);
    expect(attributeSelectorIncludes({title: true}, {title: true, country: true})).not.toBe(true);
    expect(attributeSelectorIncludes({title: true}, {title: true, director: {}})).not.toBe(true);
    expect(
      attributeSelectorIncludes({title: true, director: {}}, {title: true, director: {name: true}})
    ).not.toBe(true);
    expect(
      attributeSelectorIncludes(
        {title: true, director: {name: true}},
        {title: true, director: {country: true}}
      )
    ).not.toBe(true);
  });

  test('mergeAttributeSelectors()', () => {
    expect(mergeAttributeSelectors(false, false)).toBe(false);
    expect(mergeAttributeSelectors(false, true)).toBe(true);
    expect(mergeAttributeSelectors(true, false)).toBe(true);
    expect(mergeAttributeSelectors(true, true)).toBe(true);
    expect(mergeAttributeSelectors(true, {})).toBe(true);
    expect(mergeAttributeSelectors(true, {title: true})).toBe(true);
    expect(mergeAttributeSelectors(false, {})).toStrictEqual({});
    expect(mergeAttributeSelectors(false, {title: true})).toStrictEqual({title: true});
    expect(mergeAttributeSelectors({}, false)).toStrictEqual({});
    expect(mergeAttributeSelectors({}, true)).toBe(true);
    expect(mergeAttributeSelectors({}, {})).toStrictEqual({});
    expect(mergeAttributeSelectors({title: true}, false)).toStrictEqual({title: true});
    expect(mergeAttributeSelectors({title: true}, {})).toStrictEqual({title: true});
    expect(mergeAttributeSelectors({title: true}, {title: true})).toStrictEqual({title: true});
    expect(mergeAttributeSelectors({title: true}, {country: true})).toStrictEqual({
      title: true,
      country: true
    });
    expect(
      mergeAttributeSelectors({title: true, director: {name: true}}, {title: true, director: true})
    ).toStrictEqual({title: true, director: true});
    expect(
      mergeAttributeSelectors({title: true, director: true}, {title: true, director: {name: true}})
    ).toStrictEqual({title: true, director: true});
    expect(
      mergeAttributeSelectors(
        {title: true, director: {name: true}},
        {title: true, director: {country: true}}
      )
    ).toStrictEqual({title: true, director: {name: true, country: true}});
  });

  test('intersectAttributeSelectors()', () => {
    expect(intersectAttributeSelectors(false, false)).toBe(false);
    expect(intersectAttributeSelectors(false, true)).toBe(false);
    expect(intersectAttributeSelectors(true, false)).toBe(false);
    expect(intersectAttributeSelectors(true, true)).toBe(true);
    expect(intersectAttributeSelectors(true, {})).toStrictEqual({});
    expect(intersectAttributeSelectors(true, {title: true})).toStrictEqual({title: true});
    expect(intersectAttributeSelectors(false, {})).toBe(false);
    expect(intersectAttributeSelectors(false, {title: true})).toBe(false);
    expect(intersectAttributeSelectors({}, false)).toBe(false);
    expect(intersectAttributeSelectors({}, true)).toStrictEqual({});
    expect(intersectAttributeSelectors({}, {})).toStrictEqual({});
    expect(intersectAttributeSelectors({title: true}, false)).toBe(false);
    expect(intersectAttributeSelectors({title: true}, {})).toStrictEqual({});
    expect(intersectAttributeSelectors({title: true}, {title: true})).toStrictEqual({title: true});
    expect(intersectAttributeSelectors({title: true}, {country: true})).toStrictEqual({});
    expect(
      intersectAttributeSelectors(
        {title: true, director: {name: true}},
        {title: true, director: true}
      )
    ).toStrictEqual({title: true, director: {name: true}});
    expect(
      intersectAttributeSelectors(
        {title: true, director: true},
        {title: true, director: {name: true}}
      )
    ).toStrictEqual({title: true, director: {name: true}});
    expect(
      intersectAttributeSelectors(
        {title: true, director: {name: true}},
        {title: true, director: {country: true}}
      )
    ).toStrictEqual({title: true, director: {}});
  });

  test('removeFromAttributeSelector()', () => {
    expect(removeFromAttributeSelector(false, false)).toBe(false);
    expect(removeFromAttributeSelector(false, true)).toBe(false);
    expect(removeFromAttributeSelector(true, false)).toBe(true);
    expect(removeFromAttributeSelector(true, true)).toBe(false);
    expect(() => removeFromAttributeSelector(true, {})).toThrow(
      "Cannot remove an 'object' attribute selector from a 'true' attribute selector"
    );
    expect(removeFromAttributeSelector(false, {})).toBe(false);
    expect(removeFromAttributeSelector({}, false)).toStrictEqual({});
    expect(removeFromAttributeSelector({}, true)).toBe(false);
    expect(removeFromAttributeSelector({}, {})).toStrictEqual({});
    expect(removeFromAttributeSelector({title: true}, {})).toStrictEqual({title: true});
    expect(removeFromAttributeSelector({title: true}, {title: false})).toStrictEqual({title: true});
    expect(removeFromAttributeSelector({title: true}, {title: true})).toStrictEqual({});
    expect(removeFromAttributeSelector({title: true}, {country: true})).toStrictEqual({
      title: true
    });
    expect(
      removeFromAttributeSelector({title: true, director: {name: true}}, {director: true})
    ).toStrictEqual({
      title: true
    });
    expect(() =>
      removeFromAttributeSelector(
        {title: true, director: true},
        {title: true, director: {name: true}}
      )
    ).toThrow("Cannot remove an 'object' attribute selector from a 'true' attribute selector");
    expect(
      removeFromAttributeSelector(
        {title: true, director: {name: true}},
        {title: true, director: {name: true}}
      )
    ).toStrictEqual({director: {}});
  });

  test('iterateOverAttributeSelector()', () => {
    expect(Array.from(iterateOverAttributeSelector({}))).toStrictEqual([]);

    expect(Array.from(iterateOverAttributeSelector({title: undefined}))).toStrictEqual([]);

    expect(Array.from(iterateOverAttributeSelector({title: false}))).toStrictEqual([]);

    expect(Array.from(iterateOverAttributeSelector({title: true}))).toStrictEqual([
      ['title', true]
    ]);

    expect(Array.from(iterateOverAttributeSelector({specs: {duration: true}}))).toStrictEqual([
      ['specs', {duration: true}]
    ]);

    expect(
      Array.from(iterateOverAttributeSelector({title: true, country: false, director: true}))
    ).toStrictEqual([
      ['title', true],
      ['director', true]
    ]);
  });

  test('pickFromAttributeSelector()', () => {
    class Organization extends Component {
      @attribute() name?: string;
      @attribute() country?: string;
    }

    const organization = Organization.instantiate();
    organization.name = 'Paradise Inc.';

    const createdOn = new Date();

    const person = {
      id: 'abc123',
      email: 'hi@hello.com',
      emailIsConfirmed: true,
      reference: 123,
      tags: ['admin', 'creator'],
      location: undefined,
      organization,
      friends: [
        {__component: 'person', id: 'def456', reference: 456},
        {__component: 'person', id: 'ghi789', reference: 789}
      ],
      matrix: [
        [
          {name: 'a', value: 111},
          {name: 'b', value: 222}
        ],
        [
          {name: 'c', value: 333},
          {name: 'b', value: 444}
        ]
      ],
      createdOn
    };

    expect(pickFromAttributeSelector(person, true)).toStrictEqual(person);
    expect(pickFromAttributeSelector(person, {})).toStrictEqual({});

    expect(
      pickFromAttributeSelector(person, {
        id: true,
        emailIsConfirmed: true,
        reference: true,
        createdOn: true
      })
    ).toStrictEqual({
      id: 'abc123',
      emailIsConfirmed: true,
      reference: 123,
      createdOn
    });

    expect(pickFromAttributeSelector(person, {tags: true})).toStrictEqual({
      tags: ['admin', 'creator']
    });

    expect(pickFromAttributeSelector(person, {organization: true})).toStrictEqual({organization});

    expect(pickFromAttributeSelector(person, {organization: {name: true}})).toStrictEqual({
      organization: {name: 'Paradise Inc.'}
    });

    expect(pickFromAttributeSelector(person, {friends: true})).toStrictEqual({
      friends: [
        {__component: 'person', id: 'def456', reference: 456},
        {__component: 'person', id: 'ghi789', reference: 789}
      ]
    });

    expect(pickFromAttributeSelector(person, {friends: {id: true}})).toStrictEqual({
      friends: [{id: 'def456'}, {id: 'ghi789'}]
    });

    expect(
      pickFromAttributeSelector(
        person,
        {friends: {reference: true}},
        {includeAttributeNames: ['__component']}
      )
    ).toStrictEqual({
      friends: [
        {__component: 'person', reference: 456},
        {__component: 'person', reference: 789}
      ]
    });

    expect(pickFromAttributeSelector(person, {matrix: {value: true}})).toStrictEqual({
      matrix: [
        [{value: 111}, {value: 222}],
        [{value: 333}, {value: 444}]
      ]
    });

    expect(pickFromAttributeSelector(undefined, {location: true})).toBeUndefined();

    expect(pickFromAttributeSelector(person, {location: true})).toStrictEqual({
      location: undefined
    });

    expect(pickFromAttributeSelector(person, {location: {country: true}})).toStrictEqual({
      location: undefined
    });

    expect(() => pickFromAttributeSelector(null, {id: true})).toThrow(
      "Cannot pick attributes from a value that is not a component, a plain object, or an array (value type: 'null')"
    );
    expect(() => pickFromAttributeSelector('abc123', {id: true})).toThrow(
      "Cannot pick attributes from a value that is not a component, a plain object, or an array (value type: 'string')"
    );
    expect(() => pickFromAttributeSelector(createdOn, {id: true})).toThrow(
      "Cannot pick attributes from a value that is not a component, a plain object, or an array (value type: 'Date')"
    );
    expect(() => pickFromAttributeSelector(person, {reference: {value: true}})).toThrow(
      "Cannot pick attributes from a value that is not a component, a plain object, or an array (value type: 'number')"
    );
    expect(() => pickFromAttributeSelector(person, false)).toThrow(
      "Cannot pick attributes from a value when the specified attribute selector is 'false'"
    );
    expect(() => pickFromAttributeSelector(person, {organization: {country: true}})).toThrow(
      "Cannot get the value of an unset attribute (attribute: 'Organization.prototype.country')"
    );
    expect(() => pickFromAttributeSelector(person, {organization: {city: true}})).toThrow(
      "The attribute 'city' is missing (component: 'Organization')"
    );
  });

  test('traverseAttributeSelector()', () => {
    class Organization extends Component {
      @attribute() name?: string;
      @attribute() country?: string;
    }

    const organization = Organization.instantiate();
    organization.name = 'Paradise Inc.';

    const createdOn = new Date();

    const person = {
      id: 'abc123',
      email: 'hi@hello.com',
      emailIsConfirmed: true,
      reference: 123,
      tags: ['admin', 'creator'],
      location: undefined,
      organization,
      friends: [
        {firstName: 'Bob', lastName: 'Sinclair'},
        {firstName: 'John', lastName: 'Thomas'}
      ],
      matrix: [
        [
          {name: 'a', value: 111},
          {name: 'b', value: 222}
        ],
        [
          {name: 'c', value: 333},
          {name: 'b', value: 444}
        ]
      ],
      createdOn
    };

    const runTraverse = function (value: any, attributeSelector?: any, options?: any) {
      const results: any[] = [];

      traverseAttributeSelector(
        value,
        attributeSelector,
        function (value, attributeSelector, {name, object, isArray}) {
          results.push({
            value,
            attributeSelector,
            name,
            object,
            ...(isArray && {isArray: true})
          });
        },
        options
      );

      return results;
    };

    expect(runTraverse(person, true)).toStrictEqual([
      {value: person, attributeSelector: true, name: undefined, object: undefined}
    ]);

    expect(runTraverse(person, false)).toStrictEqual([]);

    expect(
      runTraverse(person, {
        id: true,
        emailIsConfirmed: true,
        reference: true,
        createdOn: true
      })
    ).toStrictEqual([
      {value: 'abc123', attributeSelector: true, name: 'id', object: person},
      {value: true, attributeSelector: true, name: 'emailIsConfirmed', object: person},
      {value: 123, attributeSelector: true, name: 'reference', object: person},
      {value: createdOn, attributeSelector: true, name: 'createdOn', object: person}
    ]);

    expect(runTraverse(person, {tags: true})).toStrictEqual([
      {value: ['admin', 'creator'], attributeSelector: true, name: 'tags', object: person}
    ]);

    expect(runTraverse(person, {organization: true})).toStrictEqual([
      {value: organization, attributeSelector: true, name: 'organization', object: person}
    ]);

    expect(runTraverse(person, {organization: {name: true, country: true}})).toStrictEqual([
      {value: 'Paradise Inc.', attributeSelector: true, name: 'name', object: person.organization}
    ]);

    expect(runTraverse(person, {friends: true})).toStrictEqual([
      {value: person.friends, attributeSelector: true, name: 'friends', object: person}
    ]);

    expect(runTraverse(person, {friends: {firstName: true}})).toStrictEqual([
      {value: 'Bob', attributeSelector: true, name: 'firstName', object: person.friends[0]},
      {value: 'John', attributeSelector: true, name: 'firstName', object: person.friends[1]}
    ]);

    expect(runTraverse(person, {matrix: {value: true}})).toStrictEqual([
      {value: 111, attributeSelector: true, name: 'value', object: person.matrix[0][0]},
      {value: 222, attributeSelector: true, name: 'value', object: person.matrix[0][1]},
      {value: 333, attributeSelector: true, name: 'value', object: person.matrix[1][0]},
      {value: 444, attributeSelector: true, name: 'value', object: person.matrix[1][1]}
    ]);

    expect(runTraverse(undefined, {location: true})).toStrictEqual([
      {value: undefined, attributeSelector: {location: true}, name: undefined, object: undefined}
    ]);

    expect(runTraverse(person, {location: true})).toStrictEqual([
      {value: undefined, attributeSelector: true, name: 'location', object: person}
    ]);

    expect(runTraverse(person, {location: {country: true}})).toStrictEqual([
      {
        value: undefined,
        attributeSelector: {country: true},
        name: 'location',
        object: person
      }
    ]);

    expect(
      runTraverse(
        person,
        {organization: {name: true}},
        {includeSubtrees: true, includeLeafs: false}
      )
    ).toStrictEqual([
      {
        value: person.organization,
        attributeSelector: {name: true},
        name: 'organization',
        object: person
      }
    ]);

    expect(
      runTraverse(person, {organization: {name: true}}, {includeSubtrees: true, includeLeafs: true})
    ).toStrictEqual([
      {
        value: person.organization,
        attributeSelector: {name: true},
        name: 'organization',
        object: person
      },
      {value: 'Paradise Inc.', attributeSelector: true, name: 'name', object: person.organization}
    ]);

    expect(
      runTraverse(
        person,
        {friends: {firstName: true}},
        {includeSubtrees: true, includeLeafs: false}
      )
    ).toStrictEqual([
      {
        value: person.friends[0],
        attributeSelector: {firstName: true},
        name: 'friends',
        object: person,
        isArray: true
      },
      {
        value: person.friends[1],
        attributeSelector: {firstName: true},
        name: 'friends',
        object: person,
        isArray: true
      }
    ]);

    expect(runTraverse(person, true, {includeSubtrees: true, includeLeafs: false})).toStrictEqual(
      []
    );

    expect(() => runTraverse(null, {id: true})).toThrow(
      "Cannot traverse attributes from a value that is not a component, a plain object, or an array (value type: 'null')"
    );
    expect(() => runTraverse('abc123', {id: true})).toThrow(
      "Cannot traverse attributes from a value that is not a component, a plain object, or an array (value type: 'string')"
    );
    expect(() => runTraverse(createdOn, {id: true})).toThrow(
      "Cannot traverse attributes from a value that is not a component, a plain object, or an array (value type: 'Date')"
    );
    expect(() => runTraverse(person, {reference: {value: true}})).toThrow(
      "Cannot traverse attributes from a value that is not a component, a plain object, or an array (value type: 'number')"
    );
    expect(() => runTraverse(person, {organization: {city: true}})).toThrow(
      "The attribute 'city' is missing (component: 'Organization')"
    );
  });

  test('trimAttributeSelector()', () => {
    expect(trimAttributeSelector(true)).toBe(true);
    expect(trimAttributeSelector(false)).toBe(false);
    expect(trimAttributeSelector({})).toBe(false);
    expect(trimAttributeSelector({title: false})).toBe(false);
    expect(trimAttributeSelector({director: {}})).toBe(false);
    expect(trimAttributeSelector({director: {name: false}})).toBe(false);

    expect(trimAttributeSelector({title: true})).toStrictEqual({title: true});
    expect(trimAttributeSelector({title: true, director: {name: false}})).toStrictEqual({
      title: true
    });
    expect(trimAttributeSelector({title: false, director: {name: true}})).toStrictEqual({
      director: {name: true}
    });
  });

  test('normalizeAttributeSelector()', () => {
    expect(normalizeAttributeSelector(true)).toBe(true);
    expect(normalizeAttributeSelector(false)).toBe(false);
    expect(normalizeAttributeSelector(undefined)).toBe(false);
    expect(normalizeAttributeSelector({})).toStrictEqual({});
    expect(normalizeAttributeSelector({title: true, director: {name: true}})).toStrictEqual({
      title: true,
      director: {name: true}
    });

    class Movie {}

    expect(() => normalizeAttributeSelector(null)).toThrow(
      "Expected a valid attribute selector, but received a value of type 'null'"
    );
    expect(() => normalizeAttributeSelector(1)).toThrow(
      "Expected a valid attribute selector, but received a value of type 'number'"
    );
    expect(() => normalizeAttributeSelector('a')).toThrow(
      "Expected a valid attribute selector, but received a value of type 'string'"
    );
    expect(() => normalizeAttributeSelector(['a'])).toThrow(
      "Expected a valid attribute selector, but received a value of type 'Array'"
    );
    expect(() => normalizeAttributeSelector(() => {})).toThrow(
      "Expected a valid attribute selector, but received a value of type 'Function'"
    );
    expect(() => normalizeAttributeSelector(new Date())).toThrow(
      "Expected a valid attribute selector, but received a value of type 'Date'"
    );
    expect(() => normalizeAttributeSelector(new Movie())).toThrow(
      "Expected a valid attribute selector, but received a value of type 'Movie'"
    );
  });
});

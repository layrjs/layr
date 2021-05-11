import {Route, isRouteInstance} from './route';

describe('Route', () => {
  test('new Route()', async () => {
    let route = new Route('Main', '/movies');

    expect(isRouteInstance(route)).toBe(true);

    expect(route.getName()).toBe('Main');
    expect(route.getPattern()).toBe('/movies');
    expect(route.getParams()).toStrictEqual({});
    expect(route.getAliases()).toStrictEqual([]);
    expect(route.getFilter()).toBeUndefined();

    // --- Using aliases ---

    route = new Route('Main', '/movies', {aliases: ['/']});

    expect(route.getName()).toBe('Main');
    expect(route.getPattern()).toBe('/movies');
    expect(route.getParams()).toStrictEqual({});
    expect(route.getAliases()).toStrictEqual(['/']);
    expect(route.getFilter()).toBeUndefined();

    // -- Using route identifiers ---

    route = new Route('Main', '/movies/:id');

    expect(route.getName()).toBe('Main');
    expect(route.getPattern()).toBe('/movies/:id');
    expect(route.getParams()).toStrictEqual({});
    expect(route.getAliases()).toStrictEqual([]);
    expect(route.getFilter()).toBeUndefined();

    // -- Using route parameters ---

    route = new Route('Main', '/movies', {params: {showDetails: 'boolean?'}});

    expect(route.getName()).toBe('Main');
    expect(route.getPattern()).toBe('/movies');
    expect(route.getParams()).toStrictEqual({showDetails: 'boolean?'});
    expect(route.getAliases()).toStrictEqual([]);
    expect(route.getFilter()).toBeUndefined();

    // @ts-expect-error
    expect(() => new Route('Main', '/movies', {params: {showDetails: 'any'}})).toThrow(
      "Couldn't parse a route (or wrapper) parameter type ('any' is not a supported type)"
    );

    // -- Using route filters ---

    const filter = function (request: any) {
      return request?.method === 'GET';
    };

    route = new Route('Main', '/movies', {filter});

    expect(route.getName()).toBe('Main');
    expect(route.getPattern()).toBe('/movies');
    expect(route.getParams()).toStrictEqual({});
    expect(route.getAliases()).toStrictEqual([]);
    expect(route.getFilter()).toBe(filter);
  });

  test('matchURL()', async () => {
    let route = new Route('Main', '/movies');

    expect(route.matchURL('/movies')).toStrictEqual({identifiers: {}, params: {}, wrapperPath: ''});
    expect(route.matchURL('/movies/abc123')).toBeUndefined();
    expect(route.matchURL('/films')).toBeUndefined();
    expect(route.matchURL('/')).toBeUndefined();

    // --- Using aliases ---

    route = new Route('Main', '/movies', {aliases: ['/', '/films']});

    expect(route.matchURL('/movies')).toStrictEqual({identifiers: {}, params: {}, wrapperPath: ''});
    expect(route.matchURL('/')).toStrictEqual({identifiers: {}, params: {}, wrapperPath: ''});
    expect(route.matchURL('/films')).toStrictEqual({identifiers: {}, params: {}, wrapperPath: ''});
    expect(route.matchURL('/motion-pictures')).toBeUndefined();

    // -- Using route identifiers ---

    route = new Route('Main', '/movies/:id', {aliases: ['/films/:id']});

    expect(route.matchURL('/movies/abc123')).toStrictEqual({
      identifiers: {id: 'abc123'},
      params: {},
      wrapperPath: ''
    });
    expect(route.matchURL('/movies/group%2F12345')).toStrictEqual({
      identifiers: {id: 'group/12345'},
      params: {},
      wrapperPath: ''
    });
    expect(route.matchURL('/films/abc123')).toStrictEqual({
      identifiers: {id: 'abc123'},
      params: {},
      wrapperPath: ''
    });
    expect(route.matchURL('/movies')).toBeUndefined();
    expect(route.matchURL('/movies/')).toBeUndefined();
    expect(route.matchURL('/movies/abc123/about')).toBeUndefined();

    // -- Using route nested identifiers ---

    route = new Route('Main', '/projects/:project.slug/implementations/:id');
    expect(route.matchURL('/projects/realworld/implementations/abc123')).toStrictEqual({
      identifiers: {id: 'abc123', project: {slug: 'realworld'}},
      params: {},
      wrapperPath: ''
    });

    // --- Using route identifier prefixes ---

    route = new Route('Main', '/@:username');

    expect(route.matchURL('/@john')).toStrictEqual({
      identifiers: {username: 'john'},
      params: {},
      wrapperPath: ''
    });
    expect(route.matchURL('/@')).toBeUndefined();
    expect(route.matchURL('/john')).toBeUndefined();

    // -- Using wrappers ---

    route = new Route('Main', '[/projects/:project.slug]/implementations/:id');
    expect(route.matchURL('/projects/realworld/implementations/abc123')).toStrictEqual({
      identifiers: {id: 'abc123', project: {slug: 'realworld'}},
      params: {},
      wrapperPath: '/projects/realworld'
    });

    // --- Using optional route parameters ---

    route = new Route('Main', '/movies/:id', {
      params: {language: 'string?', showDetails: 'boolean?'}
    });

    expect(route.matchURL('/movies/abc123')).toStrictEqual({
      identifiers: {id: 'abc123'},
      params: {language: undefined, showDetails: undefined},
      wrapperPath: ''
    });
    expect(route.matchURL('/movies/abc123?language=fr')).toStrictEqual({
      identifiers: {id: 'abc123'},
      params: {language: 'fr', showDetails: undefined},
      wrapperPath: ''
    });
    expect(route.matchURL('/movies/abc123?language=fr&showDetails=1')).toStrictEqual({
      identifiers: {id: 'abc123'},
      params: {language: 'fr', showDetails: true},
      wrapperPath: ''
    });
    expect(route.matchURL('/movies/abc123?unknownParam=abc')).toStrictEqual({
      identifiers: {id: 'abc123'},
      params: {language: undefined, showDetails: undefined},
      wrapperPath: ''
    });
    expect(() => route.matchURL('/movies/abc123?showDetails=true')).toThrow(
      "Couldn't deserialize a route (or wrapper) parameter (name: 'showDetails', value: 'true', type: 'boolean?'"
    );

    // --- Using required route parameters ---

    route = new Route('Main', '/', {params: {language: 'string'}});

    expect(route.matchURL('/?language=fr')).toStrictEqual({
      identifiers: {},
      params: {language: 'fr'},
      wrapperPath: ''
    });

    expect(() => route.matchURL('/')).toThrow(
      "A required route (or wrapper) parameter is missing (name: 'language', type: 'string')"
    );

    // -- Using route filters ---

    route = new Route('Main', '/movies', {
      filter(request: any) {
        return request?.method === 'GET';
      }
    });

    expect(route.matchURL('/movies', {method: 'GET'})).toStrictEqual({
      identifiers: {},
      params: {},
      wrapperPath: ''
    });
    expect(route.matchURL('/movies', {method: 'POST'})).toBeUndefined();
    expect(route.matchURL('/movies')).toBeUndefined();
  });

  test('generateURL()', async () => {
    let route = new Route('Main', '/movies');

    expect(route.generateURL()).toBe('/movies');

    route = new Route('Main', '/movies/:id');

    expect(route.generateURL({id: 'abc123'})).toBe('/movies/abc123');
    expect(route.generateURL({id: 'group/12345'})).toBe('/movies/group%2F12345');

    // Make sure it works with non-enumerable properties
    const movie = {};
    Object.defineProperty(movie, 'id', {value: 'abc123'});

    expect(route.generateURL(movie)).toBe('/movies/abc123');

    expect(() => route.generateURL()).toThrow(
      "Couldn't build a route (or wrapper) path from the pattern '/movies/:id' because the identifier 'id' is missing"
    );
    expect(() => route.generateURL({})).toThrow(
      "Couldn't build a route (or wrapper) path from the pattern '/movies/:id' because the identifier 'id' is missing"
    );
    expect(() => route.generateURL({id: ''})).toThrow(
      "Couldn't build a route (or wrapper) path from the pattern '/movies/:id' because the identifier 'id' is missing"
    );
    expect(() => route.generateURL({ref: 'abc123'})).toThrow(
      "Couldn't build a route (or wrapper) path from the pattern '/movies/:id' because the identifier 'id' is missing"
    );

    // -- Using route nested identifiers ---

    route = new Route('Main', '/projects/:project.slug/implementations/:id');

    expect(route.generateURL({id: 'abc123', project: {slug: 'realworld'}})).toBe(
      '/projects/realworld/implementations/abc123'
    );

    // --- Using route identifier prefixes ---

    route = new Route('Main', '/@:username');

    expect(route.generateURL({username: 'john'})).toBe('/@john');
    expect(() => route.generateURL({})).toThrow(
      "Couldn't build a route (or wrapper) path from the pattern '/@:username' because the identifier 'username' is missing"
    );
    expect(() => route.generateURL({username: ''})).toThrow(
      "Couldn't build a route (or wrapper) path from the pattern '/@:username' because the identifier 'username' is missing"
    );

    // --- Using route parameters ---

    route = new Route('Main', '/movies/:id', {
      params: {language: 'string?', showDetails: 'boolean?'}
    });

    expect(route.generateURL({id: 'abc123'})).toBe('/movies/abc123');
    expect(route.generateURL({id: 'abc123'}, {language: 'fr'})).toBe('/movies/abc123?language=fr');
    expect(route.generateURL({id: 'abc123'}, {language: 'fr', showDetails: true})).toBe(
      '/movies/abc123?language=fr&showDetails=1'
    );
    expect(route.generateURL({id: 'abc123'}, {unknownParam: 'abc'})).toBe('/movies/abc123');
    expect(() => route.generateURL({id: 'abc123'}, {language: 123})).toThrow(
      "Couldn't serialize a route (or wrapper) parameter (name: 'language', value: '123', expected type: 'string?', received type: 'number')"
    );

    // --- Using the 'hash' option ---

    route = new Route('Main', '/movies/:id');

    expect(route.generateURL({id: 'abc123'}, {}, {hash: 'main'})).toBe('/movies/abc123#main');
  });

  test('generatePath()', async () => {
    const route = new Route('Main', '/movies/:id', {params: {language: 'string?'}});

    expect(route.generatePath({id: 'abc123'})).toBe('/movies/abc123');
  });

  test('generateQueryString()', async () => {
    const route = new Route('Main', '/movies/:id', {params: {language: 'string?'}});

    expect(route.generateQueryString({})).toBe('');
    expect(route.generateQueryString({language: 'fr'})).toBe('language=fr');
  });
});

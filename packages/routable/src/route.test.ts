import {Route} from './route';
import {isRouteInstance} from './utilities';

describe('Route', () => {
  test('new Route()', async () => {
    let route = new Route('Main', '/movies');

    expect(isRouteInstance(route)).toBe(true);

    expect(route.getName()).toBe('Main');
    expect(route.getPattern()).toBe('/movies');
    expect(route.getAliases()).toEqual([]);

    route = new Route('Main', '/movies', {aliases: ['/']});

    expect(route.getName()).toBe('Main');
    expect(route.getPattern()).toBe('/movies');
    expect(route.getAliases()).toEqual(['/']);

    route = new Route('Main', '/movies/:id');

    expect(route.getName()).toBe('Main');
    expect(route.getPattern()).toBe('/movies/:id');
    expect(route.getAliases()).toEqual([]);
  });

  test('matchURL()', async () => {
    let route = new Route('Main', '/movies');

    expect(route.matchURL('/movies')).toEqual({});
    expect(route.matchURL('/movies/abc123')).toBeUndefined();
    expect(route.matchURL('/films')).toBeUndefined();
    expect(route.matchURL('/')).toBeUndefined();

    route = new Route('Main', '/movies', {aliases: ['/', '/films']});

    expect(route.matchURL('/movies')).toEqual({});
    expect(route.matchURL('/')).toEqual({});
    expect(route.matchURL('/films')).toEqual({});
    expect(route.matchURL('/motion-pictures')).toBeUndefined();

    route = new Route('Main', '/movies/:id', {aliases: ['/films/:id']});

    expect(route.matchURL('/movies/abc123')).toEqual({id: 'abc123'});
    expect(route.matchURL('/films/abc123')).toEqual({id: 'abc123'});
    expect(route.matchURL('/movies')).toBeUndefined();
    expect(route.matchURL('/movies/')).toBeUndefined();
    expect(route.matchURL('/movies/abc123/about')).toBeUndefined();

    // --- Using parameter constraints ---

    route = new Route('Main', '/:mentionName(@[a-z]+)');

    expect(route.matchURL('/@user')).toEqual({mentionName: '@user'});
    expect(route.matchURL('/@USER')).toEqual({mentionName: '@USER'});
    expect(route.matchURL('/@123')).toBeUndefined();
    expect(route.matchURL('/@')).toBeUndefined();
    expect(route.matchURL('/user')).toBeUndefined();

    // --- Using query parameters ---

    route = new Route('Main', '/movies/:id\\?:language&:showDetails');

    expect(route.matchURL('/movies/abc123')).toEqual({id: 'abc123'});
    expect(route.matchURL('/movies/abc123?language=fr')).toEqual({id: 'abc123', language: 'fr'});
    expect(route.matchURL('/movies/abc123?language=fr&showDetails=true')).toEqual({
      id: 'abc123',
      language: 'fr',
      showDetails: 'true'
    });
    expect(route.matchURL('/movies/abc123?unknownParam=abc')).toEqual({id: 'abc123'});
  });

  test('generateURL()', async () => {
    let route = new Route('Main', '/movies');

    expect(route.generateURL()).toBe('/movies');

    route = new Route('Main', '/movies/:id');

    expect(route.generateURL({id: 'abc123'})).toBe('/movies/abc123');

    // Make sure it works with non-enumerable properties
    const movie = {};
    Object.defineProperty(movie, 'id', {value: 'abc123'});

    expect(route.generateURL(movie)).toBe('/movies/abc123');

    expect(() => route.generateURL()).toThrow();
    expect(() => route.generateURL({})).toThrow();
    expect(() => route.generateURL({id: ''})).toThrow();
    expect(() => route.generateURL({ref: 'abc123'})).toThrow();

    // --- Using parameter constraints ---

    route = new Route('Main', '/:mentionName(@[a-z]+)');

    expect(route.generateURL({mentionName: '@user'})).toBe('/@user');
    expect(() => route.generateURL({mentionName: '@123'})).toThrow();
    expect(() => route.generateURL({mentionName: '@'})).toThrow();
    expect(() => route.generateURL()).toThrow();

    // --- Using query parameters ---

    route = new Route('Main', '/movies/:id\\?:language&:showDetails');

    expect(route.generateURL({id: 'abc123'})).toBe('/movies/abc123');
    expect(route.generateURL({id: 'abc123', language: 'fr'})).toBe('/movies/abc123?language=fr');
    expect(route.generateURL({id: 'abc123', language: 'fr', showDetails: 'true'})).toBe(
      '/movies/abc123?language=fr&showDetails=true'
    );
    expect(route.generateURL({id: 'abc123', unknownParam: 'abc'})).toBe('/movies/abc123');

    // --- Using the 'hash' option ---

    route = new Route('Main', '/movies/:id');

    expect(route.generateURL({id: 'abc123'}, {hash: 'main'})).toBe('/movies/abc123#main');
  });

  test('generatePath()', async () => {
    const route = new Route('Main', '/movies/:id\\?:language');

    expect(route.generatePath({id: 'abc123'})).toBe('/movies/abc123');
    expect(route.generatePath({id: 'abc123', language: 'fr'})).toBe('/movies/abc123');
  });

  test('generateQueryString()', async () => {
    const route = new Route('Main', '/movies/:id\\?:language');

    expect(route.generateQueryString({id: 'abc123'})).toBe('');
    expect(route.generateQueryString({id: 'abc123', language: 'fr'})).toBe('language=fr');
  });
});

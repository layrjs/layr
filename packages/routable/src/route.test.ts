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

    expect(route.matchURL('/movies')).toStrictEqual({});
    expect(route.matchURL('/movies/abc123')).toBeUndefined();
    expect(route.matchURL('/films')).toBeUndefined();
    expect(route.matchURL('/')).toBeUndefined();

    route = new Route('Main', '/movies', {aliases: ['/', '/films']});

    expect(route.matchURL('/movies')).toStrictEqual({});
    expect(route.matchURL('/')).toStrictEqual({});
    expect(route.matchURL('/films')).toStrictEqual({});
    expect(route.matchURL('/motion-pictures')).toBeUndefined();

    route = new Route('Main', '/movies/:id', {aliases: ['/films/:id']});

    expect(route.matchURL('/movies/abc123')).toStrictEqual({id: 'abc123'});
    expect(route.matchURL('/films/abc123')).toStrictEqual({id: 'abc123'});
    expect(route.matchURL('/movies')).toBeUndefined();
    expect(route.matchURL('/movies/')).toBeUndefined();
    expect(route.matchURL('/movies/abc123/about')).toBeUndefined();
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
  });
});

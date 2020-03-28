import {Component} from '@liaison/component';

import {Routable, isRoutableClass} from '../../..';

describe('Routable', () => {
  test('Routable()', async () => {
    class Movie extends Routable(Component) {}

    expect(isRoutableClass(Movie)).toBe(true);
  });

  test('getRoute()', async () => {
    class Movie extends Routable(Component) {}

    const route = Movie.setRoute('Main', '/movies/:id');

    expect(Movie.getRoute('Main')).toBe(route);
    expect(() => Movie.getRoute('About')).toThrow(
      "The route 'About' is missing (component name: 'Movie')"
    );
    expect(Movie.getRoute('About', {throwIfMissing: false})).toBeUndefined();
  });

  test('setRoute()', async () => {
    class Movie extends Routable(Component) {}

    expect(Movie.getRoute('Main', {throwIfMissing: false})).toBeUndefined();

    const mainRoute = Movie.setRoute('Main', '/movies/:id');

    expect(Movie.getRoute('Main')).toBe(mainRoute);

    // --- Testing route inheritance ---

    class MovieWithAbout extends Movie {}

    expect(MovieWithAbout.getRoute('About', {throwIfMissing: false})).toBeUndefined();

    const aboutRoute = MovieWithAbout.setRoute('About', '/movies/:id/about');

    expect(MovieWithAbout.getRoute('About')).toBe(aboutRoute);
    expect(MovieWithAbout.getRoute('Main')).toBe(mainRoute);
    expect(Movie.getRoute('About', {throwIfMissing: false})).toBeUndefined();
  });

  test('callRoute()', async () => {
    class Movie extends Routable(Component) {
      static Main({id}) {
        return `Movie #${id}`;
      }
    }

    Movie.setRoute('Main', '/movies/:id');

    expect(Movie.callRoute('Main', {id: 'abc123'})).toBe('Movie #abc123');
    expect(() => Movie.callRoute('About', {id: 'abc123'})).toThrow(
      "The route 'About' is missing (component name: 'Movie')"
    );
    expect(Movie.callRoute('About', {id: 'abc123'}, {throwIfMissing: false})).toBeUndefined();
  });

  test('findRouteForURL()', async () => {
    class Movie extends Routable(Component) {}

    const mainRoute = Movie.setRoute('Main', '/movies/:id');
    const aboutRoute = Movie.setRoute('About', '/movies/:id/about');

    expect(Movie.findRouteForURL('/movies/abc123')).toEqual({
      route: mainRoute,
      params: {id: 'abc123'}
    });
    expect(Movie.findRouteForURL('/movies/abc123/about')).toEqual({
      route: aboutRoute,
      params: {id: 'abc123'}
    });
    expect(Movie.findRouteForURL('/films/abc123')).toBeUndefined();
  });

  test('callRouteForURL()', async () => {
    class Movie extends Routable(Component) {
      static Main({id}) {
        return `Movie #${id}`;
      }
    }

    Movie.setRoute('Main', '/movies/:id');

    expect(Movie.callRouteForURL('/movies/abc123')).toBe('Movie #abc123');
    expect(() => Movie.callRouteForURL('/movies/abc123/about')).toThrow(
      "Cannot find a route matching the specified URL (component name: 'Movie', URL: '/movies/abc123/about')"
    );
    expect(Movie.callRouteForURL('/movies/abc123/about', {throwIfMissing: false})).toBeUndefined();
  });
});

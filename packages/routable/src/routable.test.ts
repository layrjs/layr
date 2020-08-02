import {Component} from '@liaison/component';

import {Routable} from './routable';
import {isRoutableClass} from './utilities';

describe('Routable', () => {
  test('Routable()', async () => {
    class Movie extends Routable(Component) {}

    expect(isRoutableClass(Movie)).toBe(true);
  });

  test('getRoute() and hasRoute()', async () => {
    class Movie extends Routable(Component) {}

    const route = Movie.setRoute('Main', '/movies/:id');

    expect(Movie.getRoute('Main')).toBe(route);

    expect(Movie.hasRoute('About')).toBe(false);
    expect(() => Movie.getRoute('About')).toThrow(
      "The route 'About' is missing (component: 'Movie')"
    );
  });

  test('setRoute()', async () => {
    class Movie extends Routable(Component) {}

    expect(Movie.hasRoute('Main')).toBe(false);

    const mainRoute = Movie.setRoute('Main', '/movies/:id');

    expect(Movie.getRoute('Main')).toBe(mainRoute);

    // --- Testing route inheritance ---

    class MovieWithAbout extends Movie {}

    expect(MovieWithAbout.hasRoute('About')).toBe(false);

    const aboutRoute = MovieWithAbout.setRoute('About', '/movies/:id/about');

    expect(MovieWithAbout.getRoute('About')).toBe(aboutRoute);
    expect(MovieWithAbout.getRoute('Main')).toBe(mainRoute);
    expect(Movie.hasRoute('About')).toBe(false);
  });

  test('callRoute()', async () => {
    class Movie extends Routable(Component) {
      static Main({id}: {id: string}) {
        return `Movie #${id}`;
      }
    }

    Movie.setRoute('Main', '/movies/:id');

    expect(Movie.callRoute('Main', {id: 'abc123'})).toBe('Movie #abc123');

    expect(() => Movie.callRoute('About', {id: 'abc123'})).toThrow(
      "The route 'About' is missing (component: 'Movie')"
    );
  });

  test('findRouteByURL()', async () => {
    class Movie extends Routable(Component) {}

    const mainRoute = Movie.setRoute('Main', '/movies/:id');
    const aboutRoute = Movie.setRoute('About', '/movies/:id/about');

    expect(Movie.findRouteByURL('/movies/abc123')).toEqual({
      route: mainRoute,
      params: {id: 'abc123'}
    });
    expect(Movie.findRouteByURL('/movies/abc123/about')).toEqual({
      route: aboutRoute,
      params: {id: 'abc123'}
    });
    expect(Movie.findRouteByURL('/films/abc123')).toBeUndefined();
  });

  test('callRouteByURL()', async () => {
    class Movie extends Routable(Component) {
      static Main({id}: {id: string}) {
        return `Movie #${id}`;
      }
    }

    Movie.setRoute('Main', '/movies/:id');

    expect(Movie.callRouteByURL('/movies/abc123')).toBe('Movie #abc123');

    expect(() => Movie.callRouteByURL('/movies/abc123/about')).toThrow(
      "Couldn't find a route matching the specified URL (component: 'Movie', URL: '/movies/abc123/about')"
    );
  });
});

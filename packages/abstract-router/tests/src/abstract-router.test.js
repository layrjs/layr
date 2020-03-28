import {Component} from '@liaison/component';
import {Routable, route} from '@liaison/routable';

import {AbstractRouter, isRouter} from '../../..';

describe('AbstractRouter', () => {
  test('new AbstractRouter()', async () => {
    class Movie extends Routable(Component) {}

    const router = new AbstractRouter([Movie]);

    expect(isRouter(router)).toBe(true);
    expect(router.getRoutable('Movie')).toBe(Movie);
  });

  describe('Routable registration', () => {
    test('getRoutable()', async () => {
      const router = new AbstractRouter();

      expect(() => router.getRoutable('Movie')).toThrow(
        "The routable class 'Movie' is not registered in the router"
      );
      expect(router.getRoutable('Movie', {throwIfMissing: false})).toBe(undefined);

      class Movie extends Routable(Component) {}

      router.registerRoutable(Movie);

      expect(router.getRoutable('Movie')).toBe(Movie);
    });

    test('registerRoutable()', async () => {
      const router = new AbstractRouter();

      class Movie extends Routable(Component) {}

      router.registerRoutable(Movie);

      expect(router.getRoutable('Movie')).toBe(Movie);

      class NotARoutable {}

      expect(() => router.registerRoutable(NotARoutable)).toThrow(
        "Expected a routable class, but received a value of type 'NotARoutable'"
      );

      expect(() => router.registerRoutable(Movie)).toThrow(
        "Cannot register a routable that is already registered (component name: 'Movie')"
      );

      class SuperMovie extends Routable(Component) {}

      SuperMovie.setComponentName('Movie');

      expect(() => router.registerRoutable(SuperMovie)).toThrow(
        "A routable with the same name is already registered (component name: 'Movie')"
      );
    });

    test('getRoutables()', async () => {
      const router = new AbstractRouter();

      class Movie extends Routable(Component) {}

      class Actor extends Routable(Component) {}

      expect(router.getRoutables()).toEqual([]);

      router.registerRoutable(Movie);

      expect(router.getRoutables()).toEqual([Movie]);

      router.registerRoutable(Actor);

      expect(router.getRoutables()).toEqual([Movie, Actor]);
    });
  });

  describe('Routes', () => {
    const getRouter = function() {
      class Movie extends Routable(Component) {
        @route('/movies/:id') static Main({id}) {
          return `Movie #${id}`;
        }
      }

      class Actor extends Routable(Component) {
        @route('/actors/top') static Top() {
          return `Top actors`;
        }
      }

      return new AbstractRouter([Movie, Actor]);
    };

    test('findRouteForURL()', async () => {
      const router = getRouter();

      let result = router.findRouteForURL('/movies/abc123');

      expect(result.Routable.getComponentName()).toBe('Movie');
      expect(result.route.getName()).toBe('Main');
      expect(result.params).toEqual({id: 'abc123'});

      result = router.findRouteForURL('/actors/top');

      expect(result.Routable.getComponentName()).toBe('Actor');
      expect(result.route.getName()).toBe('Top');
      expect(result.params).toEqual({});

      result = router.findRouteForURL('/movies/abc123/about');

      expect(result).toBeUndefined();
    });

    test('getParamsForURL()', async () => {
      const router = getRouter();

      expect(router.getParamsForURL('/movies/abc123')).toEqual({id: 'abc123'});
      expect(router.getParamsForURL('/actors/top')).toEqual({});

      expect(() => router.getParamsForURL('/movies/abc123/about')).toThrow(
        "Cannot find a route matching the specified URL (URL: '/movies/abc123/about')"
      );
    });

    test('callRouteForURL()', async () => {
      const router = getRouter();

      expect(router.callRouteForURL('/movies/abc123')).toBe('Movie #abc123');
      expect(router.callRouteForURL('/actors/top')).toBe('Top actors');

      expect(() => router.callRouteForURL('/movies/abc123/about')).toThrow(
        "Cannot find a route matching the specified URL (URL: '/movies/abc123/about')"
      );

      expect(
        router.callRouteForURL('/movies/abc123/about', {fallback: () => 'Route not found'})
      ).toBe('Route not found');
    });
  });
});

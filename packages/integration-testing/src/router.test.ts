import {Component, provide, primaryIdentifier} from '@layr/component';
import {Routable, route, wrapper, findRouteByURL, callRouteByURL} from '@layr/routable';
import {Router, isRouterInstance} from '@layr/router';

describe('Router', () => {
  class MockRouter extends Router {
    _getCurrentURL() {
      return new URL('http://localhost/');
    }

    _navigate(_url: URL) {}

    _redirect(_url: URL) {}

    _reload(_url: URL | undefined) {}

    _go(_delta: number) {}

    _getHistoryLength(): number {
      return 1;
    }
  }

  test('Creation', async () => {
    let router = new MockRouter();

    expect(isRouterInstance(router)).toBe(true);

    // @ts-expect-error
    expect(() => new MockRouter({unknown: true})).toThrow(
      "Did not expect the option 'unknown' to exist"
    );
  });

  describe('Registration', () => {
    test('registerRouter() and getRouter()', async () => {
      class Profile extends Routable(Component) {}

      class User extends Routable(Component) {
        @provide() static Profile = Profile;
      }

      class Movie extends Routable(Component) {}

      class Application extends Routable(Component) {
        @provide() static User = User;
        @provide() static Movie = Movie;
      }

      const router = new MockRouter();

      Application.registerRouter(router);

      expect(Application.getRouter()).toBe(router);
      expect(User.getRouter()).toBe(router);
      expect(Movie.getRouter()).toBe(router);
      expect(Profile.getRouter()).toBe(router);

      expect(Application.prototype.getRouter()).toBe(router);
      expect(User.prototype.getRouter()).toBe(router);
      expect(Movie.prototype.getRouter()).toBe(router);
      expect(Profile.prototype.getRouter()).toBe(router);
    });
  });

  describe('Routes', () => {
    const getApplication = function () {
      class Movie extends Routable(Component) {
        @primaryIdentifier() id!: string;

        @route('[/]movies/:id', {params: {showDetails: 'boolean?'}}) ItemPage({
          showDetails = false
        }) {
          return `Movie #${this.id}${showDetails ? ' (with details)' : ''}`;
        }
      }

      class Actor extends Routable(Component) {
        @route('[/]actors/top') static TopPage() {
          return 'Top actors';
        }
      }

      class Application extends Routable(Component) {
        @provide() static Movie = Movie;
        @provide() static Actor = Actor;

        @wrapper('/') static MainLayout({children}: {children: () => any}) {
          return `[${children()}]`;
        }

        @route('[/]ping', {
          filter(request) {
            return request?.method === 'GET';
          }
        })
        static ping() {
          return 'pong';
        }

        @route('[/]*') static NotFoundPage() {
          return 'Sorry, there is nothing here.';
        }
      }

      const router = new MockRouter();

      Application.registerRouter(router);

      return Application;
    };

    test('findRouteByURL()', async () => {
      const Application = getApplication();

      let result = findRouteByURL(Application, '/movies/abc123');

      expect(result!.routable.getComponentType()).toBe('Movie');
      expect(result!.route.getName()).toBe('ItemPage');
      expect(result!.identifiers).toEqual({id: 'abc123'});
      expect(result!.params).toEqual({});

      result = findRouteByURL(Application, '/movies/abc123?showDetails=1');

      expect(result!.routable.getComponentType()).toBe('Movie');
      expect(result!.route.getName()).toBe('ItemPage');
      expect(result!.identifiers).toEqual({id: 'abc123'});
      expect(result!.params).toEqual({showDetails: true});

      result = findRouteByURL(Application, '/actors/top');

      expect(result!.routable.getComponentType()).toBe('typeof Actor');
      expect(result!.route.getName()).toBe('TopPage');
      expect(result!.identifiers).toEqual({});
      expect(result!.params).toEqual({});

      result = findRouteByURL(Application, '/movies/abc123/details');

      expect(result!.routable.getComponentType()).toBe('typeof Application');
      expect(result!.route.getName()).toBe('NotFoundPage');
      expect(result!.identifiers).toEqual({});
      expect(result!.params).toEqual({});

      result = findRouteByURL(Application, '/ping', {method: 'GET'});

      expect(result!.routable.getComponentType()).toBe('typeof Application');
      expect(result!.route.getName()).toBe('ping');
      expect(result!.identifiers).toEqual({});
      expect(result!.params).toEqual({});

      result = findRouteByURL(Application, '/ping', {method: 'POST'});

      expect(result!.routable.getComponentType()).toBe('typeof Application');
      expect(result!.route.getName()).toBe('NotFoundPage');
      expect(result!.identifiers).toEqual({});
      expect(result!.params).toEqual({});
    });

    test('callRouteByURL()', async () => {
      const Application = getApplication();

      expect(callRouteByURL(Application, '/movies/abc123')).toBe('[Movie #abc123]');
      expect(callRouteByURL(Application, '/movies/abc123?showDetails=1')).toBe(
        '[Movie #abc123 (with details)]'
      );
      expect(callRouteByURL(Application, '/actors/top')).toBe('[Top actors]');
      expect(callRouteByURL(Application, '/movies/abc123/details')).toBe(
        '[Sorry, there is nothing here.]'
      );
      expect(callRouteByURL(Application, '/ping', {method: 'GET'})).toBe('[pong]');
      expect(callRouteByURL(Application, '/ping', {method: 'POST'})).toBe(
        '[Sorry, there is nothing here.]'
      );
    });
  });
});

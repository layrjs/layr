import {Component, provide} from '@liaison/component';
import {Routable, route} from '@liaison/routable';
import {AbstractRouter, isRouterInstance} from '@liaison/abstract-router';

describe('AbstractRouter', () => {
  class MockRouter extends AbstractRouter {
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
    class User extends Routable(Component) {}

    let router = new MockRouter();

    expect(isRouterInstance(router)).toBe(true);

    expect(Array.from(router.getRoutables())).toEqual([]);

    router = new MockRouter(User);

    expect(Array.from(router.getRoutables())).toEqual([User]);
    expect(User.getRouter()).toBe(router);

    // @ts-ignore
    expect(() => new MockRouter(User, {unknown: true})).toThrow(
      "Did not expect the option 'unknown' to exist"
    );
  });

  describe('Root components', () => {
    test('registerRootComponent() and getRootComponents()', async () => {
      class Profile extends Routable(Component) {}

      class User extends Routable(Component) {
        @provide() static Profile = Profile;
      }

      class Movie extends Routable(Component) {}

      class Root extends Component {
        @provide() static User = User;
        @provide() static Movie = Movie;
      }

      const router = new MockRouter();

      router.registerRootComponent(Root);

      expect(Array.from(router.getRootComponents())).toEqual([Root]);

      expect(Array.from(router.getRoutables())).toEqual([User, Profile, Movie]);
    });
  });

  describe('Routables', () => {
    test('getRoutable() and hasRoutable()', async () => {
      class User extends Routable(Component) {}

      let router = new MockRouter();

      expect(router.hasRoutable('User')).toBe(false);
      expect(() => router.getRoutable('User')).toThrow(
        "The routable component 'User' is not registered in the router"
      );

      router = new MockRouter(User);

      expect(router.hasRoutable('User')).toBe(true);
      expect(router.getRoutable('User')).toBe(User);
    });

    test('registerRoutable()', async () => {
      class User extends Routable(Component) {}

      const router = new MockRouter();

      router.registerRoutable(User);

      expect(router.getRoutable('User')).toBe(User);

      // Registering a routable twice in the same router should be okay
      router.registerRoutable(User);

      expect(router.getRoutable('User')).toBe(User);

      class NotARoutable {}

      // @ts-ignore
      expect(() => router.registerRoutable(NotARoutable)).toThrow(
        "Expected a routable component class, but received a value of type 'typeof NotARoutable'"
      );

      const router2 = new MockRouter();

      expect(() => router2.registerRoutable(User)).toThrow(
        "Cannot register a routable component that is already registered in another router (component: 'User')"
      );

      class User2 extends Routable(Component) {}

      User2.setComponentName('User');

      expect(() => router.registerRoutable(User2)).toThrow(
        "A routable component with the same name is already registered (component: 'User')"
      );
    });

    test('getRoutables()', async () => {
      class User extends Routable(Component) {}

      class Movie extends Routable(Component) {}

      const router = new MockRouter();

      expect(Array.from(router.getRoutables())).toEqual([]);

      router.registerRoutable(User);

      expect(Array.from(router.getRoutables())).toEqual([User]);

      router.registerRoutable(Movie);

      expect(Array.from(router.getRoutables())).toEqual([User, Movie]);
    });
  });

  describe('Routes', () => {
    const getRouter = function () {
      class Movie extends Routable(Component) {
        @route('/movies/:id') static Main({id}: {id: string}) {
          return `Movie #${id}`;
        }
      }

      class Actor extends Routable(Component) {
        @route('/actors/top') static Top() {
          return `Top actors`;
        }
      }

      class Root extends Component {
        @provide() static Movie = Movie;
        @provide() static Actor = Actor;
      }

      return new MockRouter(Root);
    };

    test('findRouteForURL()', async () => {
      const router = getRouter();

      let result = router.findRouteForURL('/movies/abc123');

      expect(result!.routable.getComponentName()).toBe('Movie');
      expect(result!.route.getName()).toBe('Main');
      expect(result!.params).toEqual({id: 'abc123'});

      result = router.findRouteForURL('/actors/top');

      expect(result!.routable.getComponentName()).toBe('Actor');
      expect(result!.route.getName()).toBe('Top');
      expect(result!.params).toEqual({});

      result = router.findRouteForURL('/movies/abc123/about');

      expect(result).toBeUndefined();
    });

    test('getParamsForURL()', async () => {
      const router = getRouter();

      expect(router.getParamsForURL('/movies/abc123')).toEqual({id: 'abc123'});
      expect(router.getParamsForURL('/actors/top')).toEqual({});

      expect(() => router.getParamsForURL('/movies/abc123/about')).toThrow(
        "Couldn't find a route matching the specified URL (URL: '/movies/abc123/about')"
      );
    });

    test('callRouteForURL()', async () => {
      const router = getRouter();

      expect(router.callRouteForURL('/movies/abc123')).toBe('Movie #abc123');
      expect(router.callRouteForURL('/actors/top')).toBe('Top actors');

      expect(() => router.callRouteForURL('/movies/abc123/about')).toThrow(
        "Couldn't find a route matching the specified URL (URL: '/movies/abc123/about')"
      );

      expect(
        router.callRouteForURL('/movies/abc123/about', {fallback: () => 'Route not found'})
      ).toBe('Route not found');
    });
  });
});

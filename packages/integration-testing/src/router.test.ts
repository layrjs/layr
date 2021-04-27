import {Component, provide, primaryIdentifier} from '@layr/component';
import {Routable, route} from '@layr/routable';
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

      const router = new MockRouter();

      expect(router.hasRoutable('User')).toBe(false);
      expect(() => router.getRoutable('User')).toThrow(
        "The routable component 'User' is not registered in the router"
      );

      router.registerRootComponent(User);

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

      // @ts-expect-error
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
        @primaryIdentifier() id!: string;

        @route('/movies/:id', {params: {showDetails: 'boolean?'}}) ItemPage({showDetails = false}) {
          return `Movie #${this.id}${showDetails ? ' (with details)' : ''}`;
        }
      }

      class Actor extends Routable(Component) {
        @route('/actors/top') static TopPage() {
          return `Top actors`;
        }
      }

      class Root extends Component {
        @provide() static Movie = Movie;
        @provide() static Actor = Actor;
      }

      const router = new MockRouter();

      router.registerRootComponent(Root);

      return router;
    };

    test('findRouteByURL()', async () => {
      const router = getRouter();

      let result = router.findRouteByURL('/movies/abc123');

      expect(result!.routable.getComponentType()).toBe('Movie');
      expect(result!.route.getName()).toBe('ItemPage');
      expect(result!.identifiers).toEqual({id: 'abc123'});
      expect(result!.params).toEqual({});

      result = router.findRouteByURL('/movies/abc123?showDetails=1');

      expect(result!.routable.getComponentType()).toBe('Movie');
      expect(result!.route.getName()).toBe('ItemPage');
      expect(result!.identifiers).toEqual({id: 'abc123'});
      expect(result!.params).toEqual({showDetails: true});

      result = router.findRouteByURL('/actors/top');

      expect(result!.routable.getComponentType()).toBe('typeof Actor');
      expect(result!.route.getName()).toBe('TopPage');
      expect(result!.identifiers).toEqual({});
      expect(result!.params).toEqual({});

      result = router.findRouteByURL('/movies/abc123/details');

      expect(result).toBeUndefined();
    });

    test('getIdentifiersFromURL()', async () => {
      const router = getRouter();

      expect(router.getIdentifiersFromURL('/movies/abc123')).toEqual({id: 'abc123'});
      expect(router.getIdentifiersFromURL('/actors/top')).toEqual({});

      expect(() => router.getIdentifiersFromURL('/movies/abc123/details')).toThrow(
        "Couldn't find a route matching the specified URL (URL: '/movies/abc123/details')"
      );
    });

    test('getParamsFromURL()', async () => {
      const router = getRouter();

      expect(router.getParamsFromURL('/movies/abc123')).toEqual({});
      expect(router.getParamsFromURL('/movies/abc123?showDetails=1')).toEqual({showDetails: true});

      expect(() => router.getParamsFromURL('/movies/abc123/details')).toThrow(
        "Couldn't find a route matching the specified URL (URL: '/movies/abc123/details')"
      );
    });

    test('callRouteByURL()', async () => {
      const router = getRouter();

      expect(router.callRouteByURL('/movies/abc123')).toBe('Movie #abc123');
      expect(router.callRouteByURL('/movies/abc123?showDetails=1')).toBe(
        'Movie #abc123 (with details)'
      );
      expect(router.callRouteByURL('/actors/top')).toBe('Top actors');

      expect(() => router.callRouteByURL('/movies/abc123/details')).toThrow(
        "Couldn't find a route matching the specified URL (URL: '/movies/abc123/details')"
      );

      expect(
        router.callRouteByURL('/movies/abc123/details', {fallback: () => 'Route not found'})
      ).toBe('Route not found');
    });
  });
});

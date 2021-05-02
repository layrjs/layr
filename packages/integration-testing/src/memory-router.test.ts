import {Component, provide, primaryIdentifier} from '@layr/component';
import {MemoryRouter} from '@layr/memory-router';
import {Routable, route, wrapper} from '@layr/routable';

describe('MemoryRouter', () => {
  let currentRouteResult: string;

  const getRouter = function () {
    class Home extends Routable(Component) {
      @route('[/]') static HomePage() {
        return `Home`;
      }
    }

    class Movie extends Routable(Component) {
      @primaryIdentifier() id!: string;

      @route('[/]movies') static ListPage() {
        return `Movies`;
      }

      @wrapper('[/]movies/:id') ItemLayout({children}: {children: () => any}) {
        return `Movie #${this.id}${children()}`;
      }

      @route('[/movies/:id]') ItemPage() {
        return '';
      }

      @route('[/movies/:id]/details') DetailsPage() {
        return ' (details)';
      }
    }

    class Root extends Routable(Component) {
      @provide() static Home = Home;
      @provide() static Movie = Movie;

      @wrapper('/') static MainLayout({children}: {children: () => any}) {
        return `[${children()}]`;
      }
    }

    const router = new MemoryRouter({
      initialURLs: ['/', '/movies', '/movies/abc123?showTrailers=true#main']
    });

    router.registerRootComponent(Root);

    router.addObserver(() => {
      currentRouteResult = router.callCurrentRoute();
    });

    router.callObservers();

    return router;
  };

  test('new ()', async () => {
    let router = new MemoryRouter();

    expect(router.getHistoryLength()).toBe(0);

    expect(() => router.getCurrentURL()).toThrow('The router has no current URL');

    router = new MemoryRouter({initialURLs: ['/', '/movies']});

    expect(router.getHistoryLength()).toBe(2);
    expect(router.getCurrentURL()).toBe('/movies');

    router = new MemoryRouter({initialURLs: ['/', '/movies'], initialIndex: 0});

    expect(router.getCurrentURL()).toBe('/');
  });

  test('getCurrentURL()', async () => {
    const router = getRouter();

    expect(router.getCurrentURL()).toBe('/movies/abc123?showTrailers=true#main');
  });

  test('getCurrentIdentifiers()', async () => {
    const router = getRouter();

    expect(router.getCurrentIdentifiers()).toEqual({id: 'abc123'});
  });

  test('getCurrentPath()', async () => {
    const router = getRouter();

    expect(router.getCurrentPath()).toBe('/movies/abc123');

    router.goBack();

    expect(router.getCurrentPath()).toBe('/movies');
  });

  test('getCurrentQuery()', async () => {
    const router = getRouter();

    expect(router.getCurrentQuery()).toEqual({showTrailers: 'true'});

    router.goBack();

    expect(router.getCurrentQuery()).toEqual({});
  });

  test('getCurrentHash()', async () => {
    const router = getRouter();

    expect(router.getCurrentHash()).toBe('main');

    router.goBack();

    expect(router.getCurrentHash()).toBeUndefined();
  });

  test('callCurrentRoute()', async () => {
    const router = getRouter();

    expect(router.callCurrentRoute()).toBe('[Movie #abc123]');
  });

  test('navigate()', async () => {
    const router = getRouter();

    expect(currentRouteResult).toBe('[Movie #abc123]');
    expect(router.getHistoryLength()).toBe(3);

    router.navigate('/movies/abc123/details');

    expect(currentRouteResult).toBe('[Movie #abc123 (details)]');
    expect(router.getHistoryLength()).toBe(4);

    router.go(-3); // We should be at the first entry of the history

    router.navigate('/movies/abc123');

    expect(currentRouteResult).toBe('[Movie #abc123]');
    expect(router.getHistoryLength()).toBe(2);
    expect(router.getCurrentQuery()).toEqual({});

    router.navigate('/movies/abc123?showTrailers=true');

    expect(currentRouteResult).toBe('[Movie #abc123]');
    expect(router.getHistoryLength()).toBe(3);
    expect(router.getCurrentQuery()).toEqual({showTrailers: 'true'});
  });

  test('redirect()', async () => {
    const router = getRouter();

    expect(currentRouteResult).toBe('[Movie #abc123]');
    expect(router.getHistoryLength()).toBe(3);

    router.redirect('/movies/def456');

    expect(currentRouteResult).toBe('[Movie #def456]');
    expect(router.getHistoryLength()).toBe(3);

    router.go(-2); // We should be at the first entry of the history

    router.redirect('/movies/abc123');

    expect(currentRouteResult).toBe('[Movie #abc123]');
    expect(router.getHistoryLength()).toBe(1);
  });

  test('go()', async () => {
    const router = getRouter();

    expect(currentRouteResult).toBe('[Movie #abc123]');

    router.go(-1);

    expect(currentRouteResult).toBe('[Movies]');

    router.go(-1);

    expect(currentRouteResult).toBe('[Home]');

    router.go(2);

    expect(currentRouteResult).toBe('[Movie #abc123]');

    expect(() => router.go(1)).toThrow(
      'Cannot go to an entry that does not exist in the router history'
    );

    expect(currentRouteResult).toBe('[Movie #abc123]');

    expect(() => router.go(2)).toThrow(
      'Cannot go to an entry that does not exist in the router history'
    );

    expect(currentRouteResult).toBe('[Movie #abc123]');

    expect(() => router.go(-3)).toThrow(
      'Cannot go to an entry that does not exist in the router history'
    );

    expect(currentRouteResult).toBe('[Movie #abc123]');

    expect(() => router.go(-4)).toThrow(
      'Cannot go to an entry that does not exist in the router history'
    );
  });

  test('goBack()', async () => {
    const router = getRouter();

    expect(currentRouteResult).toBe('[Movie #abc123]');

    router.goBack();

    expect(currentRouteResult).toBe('[Movies]');

    router.goBack();

    expect(currentRouteResult).toBe('[Home]');

    expect(() => router.goBack()).toThrow(
      'Cannot go to an entry that does not exist in the router history'
    );

    expect(currentRouteResult).toBe('[Home]');
  });

  test('goForward()', async () => {
    const router = getRouter();

    router.go(-2);

    expect(currentRouteResult).toBe('[Home]');

    router.goForward();

    expect(currentRouteResult).toBe('[Movies]');

    router.goForward();

    expect(currentRouteResult).toBe('[Movie #abc123]');

    expect(() => router.goForward()).toThrow(
      'Cannot go to an entry that does not exist in the router history'
    );

    expect(currentRouteResult).toBe('[Movie #abc123]');
  });

  test('getHistoryLength()', async () => {
    const router = getRouter();

    expect(router.getHistoryLength()).toBe(3);
  });
});

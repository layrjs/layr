import {Component, provide} from '@liaison/component';
import {MemoryRouter} from '@liaison/memory-router';
import {Routable, route} from '@liaison/routable';

describe('MemoryRouter', () => {
  let currentRouteResult: string;

  const getRouter = function () {
    class Home extends Routable(Component) {
      @route('/') static Main() {
        return `Home`;
      }
    }

    class MovieList extends Routable(Component) {
      @route('/movies') static Main() {
        return `Movies`;
      }
    }

    class Movie extends Routable(Component) {
      @route('/movies/:id') static Main({id}: {id: string}) {
        return `Movie #${id}`;
      }

      @route('/movies/:id/about') static About({id}: {id: string}) {
        return `About movie #${id}`;
      }
    }

    class Root extends Component {
      @provide() static Home = Home;
      @provide() static MovieList = MovieList;
      @provide() static Movie = Movie;
    }

    const router = new MemoryRouter({
      initialURLs: ['/', '/movies', '/movies/abc123?showDetails=true#main']
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

    expect(router.getCurrentURL()).toBe('/movies/abc123?showDetails=true#main');
  });

  test('getCurrentParams()', async () => {
    const router = getRouter();

    expect(router.getCurrentParams()).toEqual({id: 'abc123'});
  });

  test('getCurrentPath()', async () => {
    const router = getRouter();

    expect(router.getCurrentPath()).toBe('/movies/abc123');

    router.goBack();

    expect(router.getCurrentPath()).toBe('/movies');
  });

  test('getCurrentQuery()', async () => {
    const router = getRouter();

    expect(router.getCurrentQuery()).toEqual({showDetails: 'true'});

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

    expect(router.callCurrentRoute()).toBe('Movie #abc123');
  });

  test('navigate()', async () => {
    const router = getRouter();

    expect(currentRouteResult).toBe('Movie #abc123');
    expect(router.getHistoryLength()).toBe(3);

    router.navigate('/movies/abc123/about');

    expect(currentRouteResult).toBe('About movie #abc123');
    expect(router.getHistoryLength()).toBe(4);

    router.go(-3); // We should be at the first entry of the history

    router.navigate('/movies/abc123');

    expect(currentRouteResult).toBe('Movie #abc123');
    expect(router.getHistoryLength()).toBe(2);
    expect(router.getCurrentQuery()).toEqual({});

    router.navigate('/movies/abc123?showDetails=true');

    expect(currentRouteResult).toBe('Movie #abc123');
    expect(router.getHistoryLength()).toBe(3);
    expect(router.getCurrentQuery()).toEqual({showDetails: 'true'});
  });

  test('redirect()', async () => {
    const router = getRouter();

    expect(currentRouteResult).toBe('Movie #abc123');
    expect(router.getHistoryLength()).toBe(3);

    router.redirect('/movies/def456');

    expect(currentRouteResult).toBe('Movie #def456');
    expect(router.getHistoryLength()).toBe(3);

    router.go(-2); // We should be at the first entry of the history

    router.redirect('/movies/abc123');

    expect(currentRouteResult).toBe('Movie #abc123');
    expect(router.getHistoryLength()).toBe(1);
  });

  test('go()', async () => {
    const router = getRouter();

    expect(currentRouteResult).toBe('Movie #abc123');

    router.go(-1);

    expect(currentRouteResult).toBe('Movies');

    router.go(-1);

    expect(currentRouteResult).toBe('Home');

    router.go(2);

    expect(currentRouteResult).toBe('Movie #abc123');

    expect(() => router.go(1)).toThrow(
      'Cannot go to an entry that does not exist in the router history'
    );

    expect(currentRouteResult).toBe('Movie #abc123');

    expect(() => router.go(2)).toThrow(
      'Cannot go to an entry that does not exist in the router history'
    );

    expect(currentRouteResult).toBe('Movie #abc123');

    expect(() => router.go(-3)).toThrow(
      'Cannot go to an entry that does not exist in the router history'
    );

    expect(currentRouteResult).toBe('Movie #abc123');

    expect(() => router.go(-4)).toThrow(
      'Cannot go to an entry that does not exist in the router history'
    );
  });

  test('goBack()', async () => {
    const router = getRouter();

    expect(currentRouteResult).toBe('Movie #abc123');

    router.goBack();

    expect(currentRouteResult).toBe('Movies');

    router.goBack();

    expect(currentRouteResult).toBe('Home');

    expect(() => router.goBack()).toThrow(
      'Cannot go to an entry that does not exist in the router history'
    );

    expect(currentRouteResult).toBe('Home');
  });

  test('goForward()', async () => {
    const router = getRouter();

    router.go(-2);

    expect(currentRouteResult).toBe('Home');

    router.goForward();

    expect(currentRouteResult).toBe('Movies');

    router.goForward();

    expect(currentRouteResult).toBe('Movie #abc123');

    expect(() => router.goForward()).toThrow(
      'Cannot go to an entry that does not exist in the router history'
    );

    expect(currentRouteResult).toBe('Movie #abc123');
  });

  test('getHistoryLength()', async () => {
    const router = getRouter();

    expect(router.getHistoryLength()).toBe(3);
  });
});

import {Component, provide, primaryIdentifier} from '@layr/component';
import {MemoryNavigator} from '@layr/memory-navigator';
import {Routable, route, wrapper, callRouteByURL} from '@layr/routable';

describe('MemoryNavigator', () => {
  let currentRouteResult: string;

  const getNavigator = function () {
    class Home extends Routable(Component) {
      @route('[]/') static HomePage() {
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

    class Application extends Routable(Component) {
      @provide() static Home = Home;
      @provide() static Movie = Movie;

      @wrapper('') static RootLayout({children}: {children: () => any}) {
        return `{${children()}}`;
      }

      @wrapper('[]/') static MainLayout({children}: {children: () => any}) {
        return `[${children()}]`;
      }
    }

    const navigator = new MemoryNavigator({
      initialURLs: ['/', '/movies', '/movies/abc123?showTrailers=true#main']
    });

    Application.registerNavigator(navigator);

    navigator.addObserver(() => {
      currentRouteResult = callRouteByURL(Application, navigator.getCurrentURL());
    });

    navigator.callObservers();

    return navigator;
  };

  test('new ()', async () => {
    let navigator = new MemoryNavigator();

    expect(navigator.getHistoryLength()).toBe(0);

    expect(() => navigator.getCurrentURL()).toThrow('The navigator has no current URL');

    navigator = new MemoryNavigator({initialURLs: ['/', '/movies']});

    expect(navigator.getHistoryLength()).toBe(2);
    expect(navigator.getCurrentURL()).toBe('/movies');

    navigator = new MemoryNavigator({initialURLs: ['/', '/movies'], initialIndex: 0});

    expect(navigator.getCurrentURL()).toBe('/');
  });

  test('getCurrentURL()', async () => {
    const navigator = getNavigator();

    expect(navigator.getCurrentURL()).toBe('/movies/abc123?showTrailers=true#main');
  });

  test('getCurrentPath()', async () => {
    const navigator = getNavigator();

    expect(navigator.getCurrentPath()).toBe('/movies/abc123');

    navigator.goBack({defer: false});

    expect(navigator.getCurrentPath()).toBe('/movies');
  });

  test('getCurrentQuery()', async () => {
    const navigator = getNavigator();

    expect(navigator.getCurrentQuery()).toEqual({showTrailers: 'true'});

    navigator.goBack({defer: false});

    expect(navigator.getCurrentQuery()).toEqual({});
  });

  test('getCurrentHash()', async () => {
    const navigator = getNavigator();

    expect(navigator.getCurrentHash()).toBe('main');

    navigator.goBack({defer: false});

    expect(navigator.getCurrentHash()).toBeUndefined();
  });

  test('navigate()', async () => {
    const navigator = getNavigator();

    expect(currentRouteResult).toBe('{[Movie #abc123]}');
    expect(navigator.getHistoryLength()).toBe(3);

    navigator.navigate('/movies/abc123/details', {defer: false});

    expect(currentRouteResult).toBe('{[Movie #abc123 (details)]}');
    expect(navigator.getHistoryLength()).toBe(4);

    navigator.go(-3); // We should be at the first entry of the history

    navigator.navigate('/movies/abc123', {defer: false});

    expect(currentRouteResult).toBe('{[Movie #abc123]}');
    expect(navigator.getHistoryLength()).toBe(2);
    expect(navigator.getCurrentQuery()).toEqual({});

    navigator.navigate('/movies/abc123?showTrailers=true', {defer: false});

    expect(currentRouteResult).toBe('{[Movie #abc123]}');
    expect(navigator.getHistoryLength()).toBe(3);
    expect(navigator.getCurrentQuery()).toEqual({showTrailers: 'true'});
  });

  test('redirect()', async () => {
    const navigator = getNavigator();

    expect(currentRouteResult).toBe('{[Movie #abc123]}');
    expect(navigator.getHistoryLength()).toBe(3);

    navigator.redirect('/movies/def456', {defer: false});

    expect(currentRouteResult).toBe('{[Movie #def456]}');
    expect(navigator.getHistoryLength()).toBe(3);

    navigator.go(-2); // We should be at the first entry of the history

    navigator.redirect('/movies/abc123', {defer: false});

    expect(currentRouteResult).toBe('{[Movie #abc123]}');
    expect(navigator.getHistoryLength()).toBe(1);
  });

  test('go()', async () => {
    const navigator = getNavigator();

    expect(currentRouteResult).toBe('{[Movie #abc123]}');

    navigator.go(-1, {defer: false});

    expect(currentRouteResult).toBe('{[Movies]}');

    navigator.go(-1, {defer: false});

    expect(currentRouteResult).toBe('{Home}');

    navigator.go(2, {defer: false});

    expect(currentRouteResult).toBe('{[Movie #abc123]}');

    expect(() => navigator.go(1, {defer: false})).toThrow(
      'Cannot go to an entry that does not exist in the navigator history'
    );

    expect(currentRouteResult).toBe('{[Movie #abc123]}');

    expect(() => navigator.go(2, {defer: false})).toThrow(
      'Cannot go to an entry that does not exist in the navigator history'
    );

    expect(currentRouteResult).toBe('{[Movie #abc123]}');

    expect(() => navigator.go(-3, {defer: false})).toThrow(
      'Cannot go to an entry that does not exist in the navigator history'
    );

    expect(currentRouteResult).toBe('{[Movie #abc123]}');

    expect(() => navigator.go(-4, {defer: false})).toThrow(
      'Cannot go to an entry that does not exist in the navigator history'
    );
  });

  test('goBack()', async () => {
    const navigator = getNavigator();

    expect(currentRouteResult).toBe('{[Movie #abc123]}');

    navigator.goBack({defer: false});

    expect(currentRouteResult).toBe('{[Movies]}');

    navigator.goBack({defer: false});

    expect(currentRouteResult).toBe('{Home}');

    expect(() => navigator.goBack({defer: false})).toThrow(
      'Cannot go to an entry that does not exist in the navigator history'
    );

    expect(currentRouteResult).toBe('{Home}');
  });

  test('goForward()', async () => {
    const navigator = getNavigator();

    navigator.go(-2, {defer: false});

    expect(currentRouteResult).toBe('{Home}');

    navigator.goForward({defer: false});

    expect(currentRouteResult).toBe('{[Movies]}');

    navigator.goForward({defer: false});

    expect(currentRouteResult).toBe('{[Movie #abc123]}');

    expect(() => navigator.goForward({defer: false})).toThrow(
      'Cannot go to an entry that does not exist in the navigator history'
    );

    expect(currentRouteResult).toBe('{[Movie #abc123]}');
  });

  test('getHistoryLength()', async () => {
    const navigator = getNavigator();

    expect(navigator.getHistoryLength()).toBe(3);
  });
});

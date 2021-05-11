import {Component, primaryIdentifier} from '@layr/component';

import {Routable} from './routable';
import {isRoutableClass, isRoutableInstance} from './utilities';

describe('Routable', () => {
  test('Routable()', async () => {
    class Movie extends Routable(Component) {}

    expect(isRoutableClass(Movie)).toBe(true);
    expect(isRoutableInstance(Movie.prototype)).toBe(true);
  });

  test('getRoute() and hasRoute()', async () => {
    class Movie extends Routable(Component) {}

    // --- Class routes ---

    const listPageRoute = Movie.setRoute('ListPage', '/movies');

    expect(Movie.getRoute('ListPage')).toBe(listPageRoute);

    expect(Movie.hasRoute('HotPage')).toBe(false);
    expect(() => Movie.getRoute('HotPage')).toThrow(
      "The route 'HotPage' is missing (component: 'Movie')"
    );

    // --- Prototype routes ---

    const itemPageRoute = Movie.prototype.setRoute('ItemPage', '/movies/:id');

    expect(Movie.prototype.getRoute('ItemPage')).toBe(itemPageRoute);

    expect(Movie.prototype.hasRoute('DetailsPage')).toBe(false);
    expect(() => Movie.prototype.getRoute('DetailsPage')).toThrow(
      "The route 'DetailsPage' is missing (component: 'Movie')"
    );
  });

  test('setRoute()', async () => {
    class Movie extends Routable(Component) {}

    class ExtendedMovie extends Movie {}

    // --- Class routes ---

    expect(Movie.hasRoute('ListPage')).toBe(false);

    const listPageRoute = Movie.setRoute('ListPage', '/movies');

    expect(Movie.getRoute('ListPage')).toBe(listPageRoute);

    // - Testing route inheritance -

    expect(ExtendedMovie.hasRoute('HotPage')).toBe(false);

    const hotPageRoute = ExtendedMovie.setRoute('HotPage', '/movies/hot');

    expect(ExtendedMovie.getRoute('HotPage')).toBe(hotPageRoute);
    expect(ExtendedMovie.getRoute('ListPage')).toBe(listPageRoute);
    expect(Movie.hasRoute('HotPage')).toBe(false);

    // --- Prototype routes ---

    expect(Movie.prototype.hasRoute('ItemPage')).toBe(false);

    const itemPageRoute = Movie.prototype.setRoute('ItemPage', '/movies/:id');

    expect(Movie.prototype.getRoute('ItemPage')).toBe(itemPageRoute);

    // - Testing route inheritance -

    expect(ExtendedMovie.prototype.hasRoute('DetailsPage')).toBe(false);

    const detailsPageRoute = ExtendedMovie.prototype.setRoute('DetailsPage', '/movies/:id/details');

    expect(ExtendedMovie.prototype.getRoute('DetailsPage')).toBe(detailsPageRoute);
    expect(ExtendedMovie.prototype.getRoute('ItemPage')).toBe(itemPageRoute);
    expect(Movie.prototype.hasRoute('DetailsPage')).toBe(false);
  });

  test('callRoute()', async () => {
    class Movie extends Routable(Component) {
      @primaryIdentifier() id!: string;

      static ListPage() {
        return `All movies`;
      }

      ItemPage({showDetails = false}) {
        return `Movie #${this.id}${showDetails ? ' (with details)' : ''}`;
      }

      static echo({message}: {message: string}) {
        if (message === 'GET:') {
          throw new Error("'message' cannot be empty");
        }

        return message;
      }

      static async echoAsync({message}: {message: string}) {
        if (message === 'GET:') {
          throw new Error("'message' cannot be empty");
        }

        return message;
      }
    }

    // --- Class routes ---

    Movie.setRoute('ListPage', '/movies');

    expect(Movie.callRoute('ListPage')).toBe('All movies');

    expect(() => Movie.callRoute('HotPage')).toThrow(
      "The route 'HotPage' is missing (component: 'Movie')"
    );

    // --- Prototype routes ---

    Movie.prototype.setRoute('ItemPage', '/movies/:id', {params: {showDetails: 'boolean?'}});

    expect(Movie.prototype.callRoute('ItemPage', {id: 'abc123'})).toBe('Movie #abc123');
    expect(Movie.prototype.callRoute('ItemPage', {id: 'def456'})).toBe('Movie #def456');
    expect(Movie.prototype.callRoute('ItemPage', {id: 'abc123'}, {showDetails: true})).toBe(
      'Movie #abc123 (with details)'
    );

    // --- Route transformers ---

    const transformers = {
      input({message}: {message: string}, {method}: {method: string}) {
        return {message: `${method}:${message}`};
      },
      output(result: string) {
        return {
          status: 200,
          headers: {'content-type': 'application/json'},
          body: JSON.stringify(result)
        };
      },
      error(error: Error) {
        return {
          status: 400,
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({message: error.message})
        };
      }
    };

    // - With a synchronous method -

    Movie.setRoute('echo', '/echo', {transformers});

    expect(
      Movie.callRoute('echo', undefined, {message: 'hello'}, undefined, {method: 'GET'})
    ).toStrictEqual({
      status: 200,
      headers: {'content-type': 'application/json'},
      body: '"GET:hello"'
    });
    expect(
      Movie.callRoute('echo', undefined, {message: ''}, undefined, {method: 'GET'})
    ).toStrictEqual({
      status: 400,
      headers: {'content-type': 'application/json'},
      body: `{"message":"'message' cannot be empty"}`
    });

    // - With an asynchronous method -

    Movie.setRoute('echoAsync', '/echo-async', {transformers});

    expect(
      await Movie.callRoute('echoAsync', undefined, {message: 'hello'}, undefined, {method: 'GET'})
    ).toStrictEqual({
      status: 200,
      headers: {'content-type': 'application/json'},
      body: '"GET:hello"'
    });
    expect(
      await Movie.callRoute('echoAsync', undefined, {message: ''}, undefined, {method: 'GET'})
    ).toStrictEqual({
      status: 400,
      headers: {'content-type': 'application/json'},
      body: `{"message":"'message' cannot be empty"}`
    });
  });

  test('findRouteByURL()', async () => {
    class Movie extends Routable(Component) {}

    // --- Class routes ---

    const listPageRoute = Movie.setRoute('ListPage', '/movies');
    const hotPageRoute = Movie.setRoute('HotPage', '/movies/hot');

    expect(Movie.findRouteByURL('/movies')).toEqual({
      route: listPageRoute,
      identifiers: {},
      params: {},
      wrapperPath: ''
    });
    expect(Movie.findRouteByURL('/movies/hot')).toEqual({
      route: hotPageRoute,
      identifiers: {},
      params: {},
      wrapperPath: ''
    });
    expect(Movie.findRouteByURL('/films')).toBeUndefined();

    // --- Prototype routes ---

    const itemPageRoute = Movie.prototype.setRoute('ItemPage', '/movies/:id');
    const detailsPageRoute = Movie.prototype.setRoute('DetailsPage', '/movies/:id/details');

    expect(Movie.prototype.findRouteByURL('/movies/abc123')).toEqual({
      route: itemPageRoute,
      identifiers: {id: 'abc123'},
      params: {},
      wrapperPath: ''
    });
    expect(Movie.prototype.findRouteByURL('/movies/abc123/details')).toEqual({
      route: detailsPageRoute,
      identifiers: {id: 'abc123'},
      params: {},
      wrapperPath: ''
    });
    expect(Movie.prototype.findRouteByURL('/films/abc123')).toBeUndefined();

    // --- Catch-all routes ---

    const notFoundPageRoute = Movie.setRoute('NotFoundPage', '/*');

    expect(Movie.findRouteByURL('/movies')).toEqual({
      route: listPageRoute,
      identifiers: {},
      params: {},
      wrapperPath: ''
    });

    expect(Movie.findRouteByURL('/films')).toEqual({
      route: notFoundPageRoute,
      identifiers: {},
      params: {},
      wrapperPath: ''
    });

    // Let's make sure that a route defined after a catch-all route is working...
    const actorListPageRoute = Movie.setRoute('ActorListPage', '/actors');

    expect(Movie.findRouteByURL('/actors')).toEqual({
      route: actorListPageRoute,
      identifiers: {},
      params: {},
      wrapperPath: ''
    });

    // ... and that the catch-all route is working too
    expect(Movie.findRouteByURL('/films')).toEqual({
      route: notFoundPageRoute,
      identifiers: {},
      params: {},
      wrapperPath: ''
    });
  });

  test('callRouteByURL()', async () => {
    class Movie extends Routable(Component) {
      @primaryIdentifier() id!: string;

      static MainLayout({children}: {children: () => any}) {
        return `[${children()}]`;
      }

      static ListPage() {
        return `All movies`;
      }

      ItemPage({showDetails = false}) {
        return `Movie #${this.id}${showDetails ? ' (with details)' : ''}`;
      }
    }

    Movie.setWrapper('MainLayout', '/');

    // --- Class routes ---

    Movie.setRoute('ListPage', '[/]movies');

    expect(Movie.callRouteByURL('/movies')).toBe('[All movies]');

    expect(() => Movie.callRouteByURL('/movies/hot')).toThrow(
      "Couldn't find a route matching the specified URL (component: 'Movie', URL: '/movies/hot')"
    );

    // --- Prototype routes ---

    Movie.prototype.setRoute('ItemPage', '[/]movies/:id', {params: {showDetails: 'boolean?'}});

    expect(Movie.prototype.callRouteByURL('/movies/abc123')).toBe('[Movie #abc123]');
    expect(Movie.prototype.callRouteByURL('/movies/abc123?showDetails=1')).toBe(
      '[Movie #abc123 (with details)]'
    );

    expect(() => Movie.prototype.callRouteByURL('/movies/abc123/details')).toThrow(
      "Couldn't find a route matching the specified URL (component: 'Movie', URL: '/movies/abc123/details')"
    );
  });
});

import {Component, provide, primaryIdentifier, attribute} from '@layr/component';

import {Routable, callRouteByURL} from './routable';
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

  test('findRouteByURL()', async () => {
    class Movie extends Routable(Component) {}

    // --- Class routes ---

    const listPageRoute = Movie.setRoute('ListPage', '/movies');
    const hotPageRoute = Movie.setRoute('HotPage', '/movies/hot');

    expect(Movie.findRouteByURL('/movies')).toStrictEqual({
      route: listPageRoute,
      identifiers: {},
      params: {},
      wrapperPath: undefined
    });
    expect(Movie.findRouteByURL('/movies/hot')).toStrictEqual({
      route: hotPageRoute,
      identifiers: {},
      params: {},
      wrapperPath: undefined
    });
    expect(Movie.findRouteByURL('/films')).toBeUndefined();

    // --- Prototype routes ---

    const itemPageRoute = Movie.prototype.setRoute('ItemPage', '/movies/:id');
    const detailsPageRoute = Movie.prototype.setRoute('DetailsPage', '/movies/:id/details');

    expect(Movie.prototype.findRouteByURL('/movies/abc123')).toStrictEqual({
      route: itemPageRoute,
      identifiers: {id: 'abc123'},
      params: {},
      wrapperPath: undefined
    });
    expect(Movie.prototype.findRouteByURL('/movies/abc123/details')).toStrictEqual({
      route: detailsPageRoute,
      identifiers: {id: 'abc123'},
      params: {},
      wrapperPath: undefined
    });
    expect(Movie.prototype.findRouteByURL('/films/abc123')).toBeUndefined();

    // --- Catch-all routes ---

    const notFoundPageRoute = Movie.setRoute('NotFoundPage', '/*');

    expect(Movie.findRouteByURL('/movies')).toStrictEqual({
      route: listPageRoute,
      identifiers: {},
      params: {},
      wrapperPath: undefined
    });

    expect(Movie.findRouteByURL('/films')).toStrictEqual({
      route: notFoundPageRoute,
      identifiers: {},
      params: {},
      wrapperPath: undefined
    });

    // Let's make sure that a route defined after a catch-all route is working...
    const actorListPageRoute = Movie.setRoute('ActorListPage', '/actors');

    expect(Movie.findRouteByURL('/actors')).toStrictEqual({
      route: actorListPageRoute,
      identifiers: {},
      params: {},
      wrapperPath: undefined
    });

    // ... and that the catch-all route is working too
    expect(Movie.findRouteByURL('/films')).toStrictEqual({
      route: notFoundPageRoute,
      identifiers: {},
      params: {},
      wrapperPath: undefined
    });
  });

  test('callRouteByURL()', async () => {
    class Studio extends Routable(Component) {
      @primaryIdentifier() id!: string;
    }

    class Movie extends Routable(Component) {
      @primaryIdentifier() id!: string;

      @attribute('Studio') studio!: Studio;

      static ListPage() {
        return `All movies`;
      }

      ItemPage({showDetails = false}) {
        return `Movie #${this.id}${showDetails ? ' (with details)' : ''}`;
      }

      ItemWithStudioPage() {
        return `Studio #${this.studio.id} > Movie #${this.id}`;
      }
    }

    class Application extends Routable(Component) {
      @provide() static Studio = Studio;
      @provide() static Movie = Movie;

      static MainLayout({children}: {children: () => any}) {
        return `[${children()}]`;
      }

      static echo({message = ''}: {message?: string}) {
        if (message === 'GET:') {
          throw new Error("'message' cannot be empty");
        }

        return message;
      }

      static async echoAsync({message = ''}: {message?: string}) {
        if (message === 'GET:') {
          throw new Error("'message' cannot be empty");
        }

        return message;
      }
    }

    Application.setWrapper('MainLayout', '/');

    // --- Class routes ---

    Movie.setRoute('ListPage', '[/]movies');

    expect(callRouteByURL(Application, '/movies')).toBe('[All movies]');

    expect(() => callRouteByURL(Application, '/movies/hot')).toThrow(
      "Couldn't find a route matching the specified URL (URL: '/movies/hot')"
    );

    // --- Prototype routes ---

    Movie.prototype.setRoute('ItemPage', '[/]movies/:id', {params: {showDetails: 'boolean?'}});

    expect(callRouteByURL(Application, '/movies/abc123')).toBe('[Movie #abc123]');
    expect(callRouteByURL(Application, '/movies/abc123?showDetails=1')).toBe(
      '[Movie #abc123 (with details)]'
    );

    expect(() => callRouteByURL(Application, '/movies/abc123/details')).toThrow(
      "Couldn't find a route matching the specified URL (URL: '/movies/abc123/details')"
    );

    Movie.prototype.setRoute('ItemWithStudioPage', '[/]studios/:studio.id/movies/:id');

    expect(callRouteByURL(Application, '/studios/abc123/movies/def456')).toBe(
      '[Studio #abc123 > Movie #def456]'
    );

    // --- Route transformers ---

    const transformers = {
      input({message = ''}: {message?: string}, {method}: {method: string}) {
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

    Application.setRoute('echo', '/echo', {params: {message: 'string?'}, transformers});

    expect(callRouteByURL(Application, '/echo?message=hello', {method: 'GET'})).toStrictEqual({
      status: 200,
      headers: {'content-type': 'application/json'},
      body: '"GET:hello"'
    });
    expect(callRouteByURL(Application, '/echo', {method: 'GET'})).toStrictEqual({
      status: 400,
      headers: {'content-type': 'application/json'},
      body: `{"message":"'message' cannot be empty"}`
    });

    // - With an asynchronous method -

    Application.setRoute('echoAsync', '/echo-async', {params: {message: 'string?'}, transformers});

    expect(
      await callRouteByURL(Application, '/echo-async?message=hello', {method: 'GET'})
    ).toStrictEqual({
      status: 200,
      headers: {'content-type': 'application/json'},
      body: '"GET:hello"'
    });
    expect(await callRouteByURL(Application, '/echo-async', {method: 'GET'})).toStrictEqual({
      status: 400,
      headers: {'content-type': 'application/json'},
      body: `{"message":"'message' cannot be empty"}`
    });
  });
});

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

      ItemPage() {
        return `Movie #${this.id}`;
      }
    }

    // --- Class routes ---

    Movie.setRoute('ListPage', '/movies');

    expect(Movie.callRoute('ListPage')).toBe('All movies');

    expect(() => Movie.callRoute('HotPage')).toThrow(
      "The route 'HotPage' is missing (component: 'Movie')"
    );

    // --- Prototype routes ---

    Movie.prototype.setRoute('ItemPage', '/movies/:id');

    expect(Movie.prototype.callRoute('ItemPage', {id: 'abc123'})).toBe('Movie #abc123');
    expect(Movie.prototype.callRoute('ItemPage', {id: 'def456'})).toBe('Movie #def456');
  });

  test('findRouteByURL()', async () => {
    class Movie extends Routable(Component) {}

    // --- Class routes ---

    const listPageRoute = Movie.setRoute('ListPage', '/movies');
    const hotPageRoute = Movie.setRoute('HotPage', '/movies/hot');

    expect(Movie.findRouteByURL('/movies')).toEqual({
      route: listPageRoute,
      params: {}
    });
    expect(Movie.findRouteByURL('/movies/hot')).toEqual({
      route: hotPageRoute,
      params: {}
    });
    expect(Movie.findRouteByURL('/films')).toBeUndefined();

    // --- Prototype routes ---

    const itemPageRoute = Movie.prototype.setRoute('ItemPage', '/movies/:id');
    const detailsPageRoute = Movie.prototype.setRoute('DetailsPage', '/movies/:id/details');

    expect(Movie.prototype.findRouteByURL('/movies/abc123')).toEqual({
      route: itemPageRoute,
      params: {id: 'abc123'}
    });
    expect(Movie.prototype.findRouteByURL('/movies/abc123/details')).toEqual({
      route: detailsPageRoute,
      params: {id: 'abc123'}
    });
    expect(Movie.prototype.findRouteByURL('/films/abc123')).toBeUndefined();
  });

  test('callRouteByURL()', async () => {
    class Movie extends Routable(Component) {
      @primaryIdentifier() id!: string;

      static ListPage() {
        return `All movies`;
      }

      ItemPage() {
        return `Movie #${this.id}`;
      }
    }

    // --- Class routes ---

    Movie.setRoute('ListPage', '/movies');

    expect(Movie.callRouteByURL('/movies')).toBe('All movies');

    expect(() => Movie.callRouteByURL('/movies/hot')).toThrow(
      "Couldn't find a route matching the specified URL (component: 'Movie', URL: '/movies/hot')"
    );

    // --- Prototype routes ---

    Movie.prototype.setRoute('ItemPage', '/movies/:id');

    expect(Movie.prototype.callRouteByURL('/movies/abc123')).toBe('Movie #abc123');

    expect(() => Movie.prototype.callRouteByURL('/movies/abc123/details')).toThrow(
      "Couldn't find a route matching the specified URL (component: 'Movie', URL: '/movies/abc123/details')"
    );
  });
});

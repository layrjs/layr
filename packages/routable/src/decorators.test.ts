import {Component, provide, primaryIdentifier, attribute} from '@layr/component';

import {Routable} from './routable';
import {route, wrapper} from './decorators';
import {isRouteInstance} from './route';
import {isWrapperInstance} from './wrapper';

describe('Decorators', () => {
  test('@route()', async () => {
    class Studio extends Component {
      @primaryIdentifier() id!: string;
    }

    class Movie extends Routable(Component) {
      @provide() static Studio = Studio;

      @primaryIdentifier() id!: string;

      @attribute('Studio') studio!: Studio;

      @route('/movies', {aliases: ['/films']}) static ListPage() {
        return `All movies`;
      }

      // Use a getter to simulate the view() decorator
      @route('/movies/:id', {aliases: ['/films/:id']}) get ItemPage() {
        return function (this: Movie) {
          return `Movie #${this.id}`;
        };
      }

      // Use a getter to simulate the view() decorator
      @route('/studios/:studio.id/movies/:id') get ItemWithStudioPage() {
        return function (this: Movie) {
          return `Movie #${this.id}`;
        };
      }
    }

    // --- Class routes ---

    const listPageRoute = Movie.getRoute('ListPage');

    expect(isRouteInstance(listPageRoute)).toBe(true);
    expect(listPageRoute.getName()).toBe('ListPage');
    expect(listPageRoute.getPattern()).toBe('/movies');
    expect(listPageRoute.getAliases()).toEqual(['/films']);
    expect(listPageRoute.matchURL('/movies')).toEqual({
      identifiers: {},
      params: {},
      wrapperPath: ''
    });
    expect(listPageRoute.matchURL('/films')).toEqual({
      identifiers: {},
      params: {},
      wrapperPath: ''
    });
    expect(listPageRoute.generateURL()).toBe('/movies');

    expect(Movie.ListPage.matchURL('/movies')).toEqual({
      identifiers: {},
      params: {},
      wrapperPath: ''
    });
    expect(Movie.ListPage.matchURL('/films')).toEqual({
      identifiers: {},
      params: {},
      wrapperPath: ''
    });
    expect(Movie.ListPage.generateURL()).toBe('/movies');

    // --- Prototype routes ---

    const itemPageRoute = Movie.prototype.getRoute('ItemPage');

    expect(isRouteInstance(itemPageRoute)).toBe(true);
    expect(itemPageRoute.getName()).toBe('ItemPage');
    expect(itemPageRoute.getPattern()).toBe('/movies/:id');
    expect(itemPageRoute.getAliases()).toEqual(['/films/:id']);
    expect(itemPageRoute.matchURL('/movies/abc123')).toEqual({
      identifiers: {id: 'abc123'},
      params: {},
      wrapperPath: ''
    });
    expect(itemPageRoute.matchURL('/films/abc123')).toEqual({
      identifiers: {id: 'abc123'},
      params: {},
      wrapperPath: ''
    });
    expect(itemPageRoute.generateURL({id: 'abc123'})).toBe('/movies/abc123');

    expect(Movie.prototype.ItemPage.matchURL('/movies/abc123')).toEqual({
      identifiers: {id: 'abc123'},
      params: {},
      wrapperPath: ''
    });
    expect(Movie.prototype.ItemPage.matchURL('/films/abc123')).toEqual({
      identifiers: {id: 'abc123'},
      params: {},
      wrapperPath: ''
    });

    const itemWithStudioPageRoute = Movie.prototype.getRoute('ItemWithStudioPage');
    expect(itemWithStudioPageRoute.getName()).toBe('ItemWithStudioPage');
    expect(itemWithStudioPageRoute.getPattern()).toBe('/studios/:studio.id/movies/:id');
    expect(itemWithStudioPageRoute.getAliases()).toEqual([]);
    expect(itemWithStudioPageRoute.matchURL('/studios/abc/movies/123')).toEqual({
      identifiers: {id: '123', studio: {id: 'abc'}},
      params: {},
      wrapperPath: ''
    });
    expect(itemWithStudioPageRoute.generateURL({id: '123', studio: {id: 'abc'}})).toBe(
      '/studios/abc/movies/123'
    );

    expect(Movie.prototype.ItemWithStudioPage.matchURL('/studios/abc/movies/123')).toEqual({
      identifiers: {id: '123', studio: {id: 'abc'}},
      params: {},
      wrapperPath: ''
    });

    // --- Instance routes ---

    const studio = new Studio({id: 'abc'});
    const movie = new Movie({id: '123', studio});

    expect(movie.ItemPage.generateURL()).toBe('/movies/123');
    expect(movie.ItemWithStudioPage.generateURL()).toBe('/studios/abc/movies/123');
  });

  test('@wrapper()', async () => {
    class Movie extends Routable(Component) {
      @wrapper('/movies') static MainLayout() {}

      @wrapper('[/movies]/:id') ItemLayout() {}
    }

    // --- Class wrappers ---

    const mainLayoutWrapper = Movie.getWrapper('MainLayout');

    expect(isWrapperInstance(mainLayoutWrapper)).toBe(true);
    expect(mainLayoutWrapper.getName()).toBe('MainLayout');
    expect(mainLayoutWrapper.getPattern()).toBe('/movies');

    // --- Prototype wrappers ---

    const itemLayoutWrapper = Movie.prototype.getWrapper('ItemLayout');

    expect(isWrapperInstance(itemLayoutWrapper)).toBe(true);
    expect(itemLayoutWrapper.getName()).toBe('ItemLayout');
    expect(itemLayoutWrapper.getPattern()).toBe('[/movies]/:id');
  });
});

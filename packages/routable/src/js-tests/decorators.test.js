import {Component, provide, primaryIdentifier, attribute} from '@layr/component';

import {Routable} from '../routable';
import {route} from '../decorators';
import {isRouteInstance} from '../route';

describe('Decorators', () => {
  test('@route()', async () => {
    class Studio extends Component {
      @primaryIdentifier() id;
    }

    class Movie extends Routable(Component) {
      @provide() static Studio = Studio;

      @primaryIdentifier() id;

      @attribute('Studio') studio;

      @route('/movies', {aliases: ['/films']}) static ListPage() {
        return `All movies`;
      }

      // Use a getter to simulate the view() decorator
      @route('/movies/:id', {aliases: ['/films/:id']}) get ItemPage() {
        return function () {
          return `Movie #${this.id}`;
        };
      }

      // Use a getter to simulate the view() decorator
      @route('/studios/:studio.id/movies/:id') get ItemWithStudioPage() {
        return function () {
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
    expect(listPageRoute.matchURL('/movies')).toEqual({identifiers: {}, params: {}});
    expect(listPageRoute.matchURL('/films')).toEqual({identifiers: {}, params: {}});
    expect(listPageRoute.generateURL()).toBe('/movies');

    expect(Movie.ListPage.matchURL('/movies')).toEqual({identifiers: {}, params: {}});
    expect(Movie.ListPage.matchURL('/films')).toEqual({identifiers: {}, params: {}});
    expect(Movie.ListPage.generateURL()).toBe('/movies');

    // --- Prototype routes ---

    const itemPageRoute = Movie.prototype.getRoute('ItemPage');

    expect(isRouteInstance(itemPageRoute)).toBe(true);
    expect(itemPageRoute.getName()).toBe('ItemPage');
    expect(itemPageRoute.getPattern()).toBe('/movies/:id');
    expect(itemPageRoute.getAliases()).toEqual(['/films/:id']);
    expect(itemPageRoute.matchURL('/movies/abc123')).toEqual({
      identifiers: {id: 'abc123'},
      params: {}
    });
    expect(itemPageRoute.matchURL('/films/abc123')).toEqual({
      identifiers: {id: 'abc123'},
      params: {}
    });
    expect(itemPageRoute.generateURL({id: 'abc123'})).toBe('/movies/abc123');

    expect(Movie.prototype.ItemPage.matchURL('/movies/abc123')).toEqual({
      identifiers: {id: 'abc123'},
      params: {}
    });
    expect(Movie.prototype.ItemPage.matchURL('/films/abc123')).toEqual({
      identifiers: {id: 'abc123'},
      params: {}
    });

    const itemWithStudioPageRoute = Movie.prototype.getRoute('ItemWithStudioPage');
    expect(itemWithStudioPageRoute.getName()).toBe('ItemWithStudioPage');
    expect(itemWithStudioPageRoute.getPattern()).toBe('/studios/:studio.id/movies/:id');
    expect(itemWithStudioPageRoute.getAliases()).toEqual([]);
    expect(itemWithStudioPageRoute.matchURL('/studios/abc/movies/123')).toEqual({
      identifiers: {id: '123', studio: {id: 'abc'}},
      params: {}
    });
    expect(itemWithStudioPageRoute.generateURL({id: '123', studio: {id: 'abc'}})).toBe(
      '/studios/abc/movies/123'
    );

    expect(Movie.prototype.ItemWithStudioPage.matchURL('/studios/abc/movies/123')).toEqual({
      identifiers: {id: '123', studio: {id: 'abc'}},
      params: {}
    });

    // --- Instance routes ---

    const studio = new Studio({id: 'abc'});
    const movie = new Movie({id: '123', studio});

    expect(movie.ItemPage.generateURL()).toBe('/movies/123');
    expect(movie.ItemWithStudioPage.generateURL()).toBe('/studios/abc/movies/123');
  });
});

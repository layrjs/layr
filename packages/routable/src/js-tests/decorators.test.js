import {Component} from '@liaison/component';

import {Routable} from '../routable';
import {route} from '../decorators';
import {isRouteInstance} from '../utilities';

describe('Decorators', () => {
  test('@route()', async () => {
    class Movie extends Routable(Component) {
      @route('/movies/:id', {aliases: ['/films/:id']}) static Main({id}) {
        return `Movie #${id}`;
      }
    }

    const mainRoute = Movie.getRoute('Main');

    expect(isRouteInstance(mainRoute)).toBe(true);
    expect(mainRoute.getName()).toBe('Main');
    expect(mainRoute.getPattern()).toBe('/movies/:id');
    expect(mainRoute.getAliases()).toEqual(['/films/:id']);
    expect(mainRoute.matchURL('/movies/abc123')).toStrictEqual({id: 'abc123'});
    expect(mainRoute.generateURL({id: 'abc123'})).toBe('/movies/abc123');

    expect(Movie.Main.matchURL('/movies/abc123')).toStrictEqual({id: 'abc123'});
    expect(Movie.Main.generateURL({id: 'abc123'})).toBe('/movies/abc123');
  });
});

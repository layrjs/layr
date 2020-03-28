import {Component} from '@liaison/component';

import {Routable, isRoute, route} from '../../..';

describe('Decorators', () => {
  test('@route()', async () => {
    class Movie extends Routable(Component) {
      @route('/movies/:id', {aliases: ['/films/:id']}) static Main({id}) {
        return `Movie #${id}`;
      }
    }

    const mainRoute = Movie.getRoute('Main');

    expect(isRoute(mainRoute)).toBe(true);
    expect(mainRoute.getName()).toBe('Main');
    expect(mainRoute.getPattern()).toBe('/movies/:id');
    expect(mainRoute.getAliases()).toEqual(['/films/:id']);

    expect(Movie.Main.generateURL({id: 'abc123'})).toBe('/movies/abc123');
  });
});

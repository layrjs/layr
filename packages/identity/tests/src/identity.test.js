import {Layer} from '@liaison/layer';
import {field} from '@liaison/model';

import {Identity} from '../../..';

describe('Identity', () => {
  test('id', async () => {
    class Movie extends Identity {}

    const layer = new Layer({Movie});
    await layer.$open();

    let movie = new layer.Movie();
    const id = movie.id; // An 'id' should have been generated automatically
    expect(typeof id === 'string').toBe(true);
    expect(id !== '').toBe(true);
    expect(movie.$serialize()).toEqual({_type: 'Movie', _new: true, _id: id});

    movie = new layer.Movie({id: 'abc123'});
    expect(movie.id).toBe('abc123');
    expect(movie.$serialize()).toEqual({_type: 'Movie', _new: true, _id: 'abc123'});

    movie = layer.Movie.$deserialize({_id: 'abc456'});
    expect(movie.id).toBe('abc456');
    expect(movie.$serialize()).toEqual({_type: 'Movie', _id: 'abc456'});
  });

  test('Identity mapping', async () => {
    class Movie extends Identity {
      @field('string') title;

      @field('Actor[]') actors;
    }

    class Actor extends Identity {
      @field('string') fullName;

      @field('number') popularity;
    }

    const layer = new Layer({Movie, Actor});
    await layer.$open();

    const movie = layer.Movie.$deserialize({
      _type: 'Movie',
      _id: 'm1',
      title: 'Inception',
      actors: [
        {_type: 'Actor', _id: 'a1', fullName: 'Leonardo DiCaprio', popularity: 90},
        {_type: 'Actor', _id: 'a2', fullName: 'Joseph Gordon-Levitt', popularity: 75}
      ]
    });
    expect(movie.id).toBe('m1');
    expect(movie.title).toBe('Inception');
    const [actor1, actor2] = movie.actors;
    expect(actor1.id).toBe('a1');
    expect(actor1.fullName).toBe('Leonardo DiCaprio');
    expect(actor1.popularity).toBe(90);
    expect(actor2.id).toBe('a2');
    expect(actor2.fullName).toBe('Joseph Gordon-Levitt');
    expect(actor2.popularity).toBe(75);

    // We can change the order of the actors
    movie.$deserialize({
      _type: 'Movie',
      _id: 'm1',
      actors: [{_type: 'Actor', _id: 'a2'}, {_type: 'Actor', _id: 'a1'}]
    });
    expect(movie.actors).toEqual([actor2, actor1]);
    expect(actor1.id).toBe('a1');
    expect(actor1.fullName).toBe('Leonardo DiCaprio');
    expect(actor1.popularity).toBe(90);
    expect(actor2.id).toBe('a2');
    expect(actor2.fullName).toBe('Joseph Gordon-Levitt');
    expect(actor2.popularity).toBe(75);

    // We can partially change an actor (while restoring the initial order)
    movie.$deserialize({
      _type: 'Movie',
      _id: 'm1',
      actors: [{_type: 'Actor', _id: 'a1'}, {_type: 'Actor', _id: 'a2', popularity: 80}]
    });
    expect(movie.actors).toEqual([actor1, actor2]);
    expect(actor1.id).toBe('a1');
    expect(actor1.fullName).toBe('Leonardo DiCaprio');
    expect(actor1.popularity).toBe(90);
    expect(actor2.id).toBe('a2');
    expect(actor2.fullName).toBe('Joseph Gordon-Levitt');
    expect(actor2.popularity).toBe(80);

    // We can insert an actor
    movie.$deserialize({
      _type: 'Movie',
      _id: 'm1',
      actors: [
        {_type: 'Actor', _id: 'a1'},
        {_type: 'Actor', _id: 'a3', fullName: 'Ellen Page', popularity: 85},
        {_type: 'Actor', _id: 'a2'}
      ]
    });
    const actor3 = movie.actors[1];
    expect(movie.actors).toEqual([actor1, actor3, actor2]);
    expect(actor1.id).toBe('a1');
    expect(actor1.fullName).toBe('Leonardo DiCaprio');
    expect(actor1.popularity).toBe(90);
    expect(actor2.id).toBe('a2');
    expect(actor2.fullName).toBe('Joseph Gordon-Levitt');
    expect(actor2.popularity).toBe(80);
    expect(actor3.id).toBe('a3');
    expect(actor3.fullName).toBe('Ellen Page');
    expect(actor3.popularity).toBe(85);

    // We can remove an actor
    movie.$deserialize({
      _type: 'Movie',
      _id: 'm1',
      actors: [{_type: 'Actor', _id: 'a3'}, {_type: 'Actor', _id: 'a2'}]
    });
    expect(movie.actors).toEqual([actor3, actor2]);
    expect(actor2.id).toBe('a2');
    expect(actor2.fullName).toBe('Joseph Gordon-Levitt');
    expect(actor2.popularity).toBe(80);
    expect(actor3.id).toBe('a3');
    expect(actor3.fullName).toBe('Ellen Page');
    expect(actor3.popularity).toBe(85);
  });
});

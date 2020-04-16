import {Entity, primaryIdentifier, secondaryIdentifier, attribute} from '../../..';

describe('Serialization', () => {
  test('Entity instances', async () => {
    class Movie extends Entity {
      @primaryIdentifier() id;
      @secondaryIdentifier() slug;
      @attribute('string') title;
    }

    let movie = Movie.fork().instantiate({title: 'Inception'});

    expect(movie.serialize()).toEqual({
      __component: 'movie',
      title: 'Inception'
    });

    expect(movie.serialize({returnComponentReferences: true})).toEqual({
      __component: 'movie',
      title: 'Inception'
    });

    movie = Movie.fork().instantiate({id: 'abc123', title: 'Inception'});

    expect(movie.serialize()).toEqual({
      __component: 'movie',
      id: 'abc123',
      title: 'Inception'
    });

    expect(movie.serialize({returnComponentReferences: true})).toEqual({
      __component: 'movie',
      id: 'abc123'
    });

    movie = Movie.fork().instantiate({slug: 'inception', title: 'Inception'});

    expect(movie.serialize()).toEqual({
      __component: 'movie',
      slug: 'inception',
      title: 'Inception'
    });

    expect(movie.serialize({returnComponentReferences: true})).toEqual({
      __component: 'movie',
      slug: 'inception'
    });

    movie = Movie.fork().instantiate({id: 'abc123', slug: 'inception', title: 'Inception'});

    expect(movie.serialize()).toEqual({
      __component: 'movie',
      id: 'abc123',
      slug: 'inception',
      title: 'Inception'
    });

    expect(movie.serialize({returnComponentReferences: true})).toEqual({
      __component: 'movie',
      id: 'abc123'
    });

    // --- With nested entities ---

    class Cinema extends Entity {
      @primaryIdentifier() id;
      @attribute('string') name;
      @attribute('[movie]') movies;
    }

    Cinema.registerRelatedComponent(Movie);

    movie = Movie.instantiate({id: 'abc123', title: 'Inception'});

    const cinema = Cinema.instantiate({
      id: 'xyz456',
      name: 'Paradiso',
      movies: [movie]
    });

    expect(cinema.serialize()).toEqual({
      __component: 'cinema',
      id: 'xyz456',
      name: 'Paradiso',
      movies: [{__component: 'movie', id: 'abc123'}]
    });

    let referencedComponents = new Set();

    expect(cinema.serialize({referencedComponents})).toEqual({
      __component: 'cinema',
      id: 'xyz456',
      name: 'Paradiso',
      movies: [{__component: 'movie', id: 'abc123'}]
    });
    expect(Array.from(referencedComponents)).toEqual([Movie, movie]);

    referencedComponents = new Set();

    expect(cinema.serialize({returnComponentReferences: true, referencedComponents})).toEqual({
      __component: 'cinema',
      id: 'xyz456'
    });
    expect(Array.from(referencedComponents)).toEqual([Movie, Cinema, cinema]);
  });
});

import {Component, Entity, primaryIdentifier, attribute} from '../../..';

describe('Cloning', () => {
  test('Simple entity', async () => {
    class Movie extends Entity {
      @primaryIdentifier() id;
      @attribute('string') title;
    }

    const movie = new Movie({title: 'Inception'});

    const clonedMovie = movie.clone();

    expect(clonedMovie).toBe(movie);
  });

  test('Nested entity', async () => {
    class Movie extends Component {
      @attribute() director;
    }

    class Director extends Entity {
      @primaryIdentifier() id;
      @attribute('string') name;
    }

    const movie = new Movie({director: new Director({name: 'Christopher Nolan'})});

    const clonedMovie = movie.clone();

    expect(clonedMovie).not.toBe(movie);
    expect(clonedMovie.director).toBe(movie.director);
  });
});

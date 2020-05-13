import {Component} from './component';
import {attribute} from './decorators';

describe('Cloning', () => {
  test('Simple component', async () => {
    class Movie extends Component {
      @attribute() title?: string;
      @attribute() tags?: string[];
      @attribute() specs?: {duration?: number};
    }

    expect(Movie.clone()).toBe(Movie);

    let movie = new Movie({title: 'Inception', tags: ['drama'], specs: {duration: 120}});

    let clonedMovie = movie.clone();

    expect(clonedMovie).not.toBe(movie);
    expect(clonedMovie.getComponentType()).toBe('Movie');
    expect(clonedMovie.isNew()).toBe(true);
    expect(clonedMovie.title).toBe(movie.title);
    expect(clonedMovie.tags).not.toBe(movie.tags);
    expect(clonedMovie.tags).toEqual(movie.tags);
    expect(clonedMovie.specs).not.toBe(movie.specs);
    expect(clonedMovie.specs).toEqual(movie.specs);

    movie = Movie.instantiate({title: 'Inception'}, {isNew: true, attributeSelector: true});

    clonedMovie = movie.clone();

    expect(clonedMovie).not.toBe(movie);
    expect(clonedMovie.getComponentType()).toBe('Movie');
    expect(clonedMovie.isNew()).toBe(true);
    expect(clonedMovie.title).toBe(movie.title);
    expect(clonedMovie.tags).toBeUndefined();
    expect(clonedMovie.specs).toBeUndefined();

    movie = Movie.instantiate({title: 'Inception'});

    clonedMovie = movie.clone();

    expect(clonedMovie).not.toBe(movie);
    expect(clonedMovie.getComponentType()).toBe('Movie');
    expect(clonedMovie.isNew()).toBe(false);
    expect(clonedMovie.title).toBe(movie.title);
    expect(clonedMovie.getAttribute('tags').isSet()).toBe(false);
    expect(clonedMovie.getAttribute('specs').isSet()).toBe(false);
  });

  test('Nested component', async () => {
    class Movie extends Component {
      @attribute() director!: Director;
    }

    class Director extends Component {
      @attribute() name?: string;
    }

    const movie = new Movie({director: new Director({name: 'Christopher Nolan'})});

    const clonedMovie = movie.clone();

    expect(clonedMovie.director.getComponentType()).toBe('Director');
    expect(clonedMovie.director).not.toBe(movie.director);
    expect(clonedMovie.director.name).toBe('Christopher Nolan');

    clonedMovie.director.name = 'Christopher Nolan 2';

    expect(clonedMovie.director.name).toBe('Christopher Nolan 2');
    expect(movie.director.name).toBe('Christopher Nolan');
  });
});

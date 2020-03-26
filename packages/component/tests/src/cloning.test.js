import {Component, attribute} from '../../..';

describe('Cloning', () => {
  test('Simple component', async () => {
    class Movie extends Component {
      @attribute() title;
      @attribute() tags;
      @attribute() specs;
    }

    expect(Movie.clone()).toBe(Movie);

    let movie = new Movie({title: 'Inception', tags: ['drama'], specs: {duration: 120}});

    let clonedMovie = movie.clone();

    expect(clonedMovie).not.toBe(movie);
    expect(clonedMovie.getComponentName()).toBe('movie');
    expect(clonedMovie.isNew()).toBe(true);
    expect(clonedMovie.title).toBe(movie.title);
    expect(clonedMovie.tags).not.toBe(movie.tags);
    expect(clonedMovie.tags).toEqual(movie.tags);
    expect(clonedMovie.specs).not.toBe(movie.specs);
    expect(clonedMovie.specs).toEqual(movie.specs);

    movie = Movie.prototype.deserialize({__new: true, title: 'Inception'});

    clonedMovie = movie.clone();

    expect(clonedMovie).not.toBe(movie);
    expect(clonedMovie.getComponentName()).toBe('movie');
    expect(clonedMovie.isNew()).toBe(true);
    expect(clonedMovie.title).toBe(movie.title);
    expect(clonedMovie.tags).toBeUndefined();
    expect(clonedMovie.specs).toBeUndefined();

    movie = Movie.prototype.deserialize({title: 'Inception'});

    clonedMovie = movie.clone();

    expect(clonedMovie).not.toBe(movie);
    expect(clonedMovie.getComponentName()).toBe('movie');
    expect(clonedMovie.isNew()).toBe(false);
    expect(clonedMovie.title).toBe(movie.title);
    expect(clonedMovie.getAttribute('tags').isSet()).toBe(false);
    expect(clonedMovie.getAttribute('specs').isSet()).toBe(false);
  });

  test('Nested component', async () => {
    class Movie extends Component {
      @attribute() director;
    }

    class Director extends Component {
      @attribute() name;
    }

    const movie = new Movie({director: new Director({name: 'Christopher Nolan'})});

    const clonedMovie = movie.clone();

    expect(clonedMovie.director.getComponentName()).toBe('director');
    expect(clonedMovie.director).not.toBe(movie.director);
    expect(clonedMovie.director.name).toBe('Christopher Nolan');

    clonedMovie.director.name = 'Christopher Nolan 2';

    expect(clonedMovie.director.name).toBe('Christopher Nolan 2');
    expect(movie.director.name).toBe('Christopher Nolan');
  });
});

import {Model, field} from '../../..';

describe('@superstore/model', () => {
  test('Simple model', () => {
    class Movie extends Model {
      @field('string') title;

      @field('number') year;
    }

    const movie = new Movie({title: 'Inception', year: 2010});
    expect(movie.title).toBe('Inception');
    expect(movie.year).toBe(2010);

    movie.title = 'The Matrix';
    expect(movie.title).toBe('The Matrix');
    movie.year = 1999;
    expect(movie.year).toBe(1999);

    expect(() => {
      return new Movie({unknownField: 'abc'}); // Cannot set an undefined field
    }).toThrow();
  });

  test('Model inheritance', () => {
    class Item extends Model {
      @field('string') id;
    }

    class Movie extends Item {
      @field('string') title;
    }

    const movie = new Movie({id: 'abc123', title: 'Inception'});
    expect(movie.id).toBe('abc123');
    expect(movie.title).toBe('Inception');

    expect(() => {
      return class Actor extends Item {
        @field('string') id; // Cannot add a property that already exists
      };
    }).toThrow();
  });

  test('Model nesting', () => {
    class Movie extends Model {
      @field('string') title;

      @field('TechnicalSpecs') technicalSpecs;
    }

    class TechnicalSpecs extends Model {
      @field('string') aspectRatio;
    }

    const movie = new Movie({
      title: 'Inception',
      technicalSpecs: new TechnicalSpecs({aspectRatio: '2.39:1'})
    });
    expect(movie.technicalSpecs.aspectRatio).toBe('2.39:1');
  });
});

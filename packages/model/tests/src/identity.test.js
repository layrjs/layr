import {Identity} from '../../..';

describe('Identity', () => {
  test('id', () => {
    class Movie extends Identity {}

    let movie = new Movie();
    const id = movie.id; // An 'id' should have been generated automatically
    expect(typeof id === 'string').toBe(true);
    expect(id !== '').toBe(true);

    expect(movie.serialize()).toEqual({_new: true, _type: 'Movie', _id: id});

    movie = Movie.deserialize({_id: 'abc123'});
    expect(movie.id).toBe('abc123');
    expect(movie.serialize()).toEqual({_type: 'Movie', _id: 'abc123'});
  });
});

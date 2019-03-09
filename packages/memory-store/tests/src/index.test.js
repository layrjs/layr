import {MemoryStore} from '../../..';

describe('@superstore/memory-store', () => {
  test('CRUD operations', () => {
    const store = new MemoryStore();

    // Create
    store.set({_type: 'Movie', _id: 'abc123', title: 'Inception', genre: 'action'});

    // Read
    let movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({_type: 'Movie', _id: 'abc123', title: 'Inception', genre: 'action'});

    // Update
    store.set({_type: 'Movie', _id: 'abc123', title: 'The Matrix', genre: undefined});
    movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({_type: 'Movie', _id: 'abc123', title: 'The Matrix'});

    // Remove
    let hasBeenDeleted = store.delete({_type: 'Movie', _id: 'abc123'});
    expect(hasBeenDeleted).toBe(true);
    movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toBeUndefined();
    hasBeenDeleted = store.delete({_type: 'Movie', _id: 'abc123'});
    expect(hasBeenDeleted).toBe(false);
  });

  test('References', () => {
    const store = new MemoryStore();

    store.set({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      director: {_type: 'Person', _ref: true, _id: 'xyz123', fullName: 'Christopher Nolan'}
    });

    // Will fetch both 'Movie' and 'Person'
    let movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      director: {_type: 'Person', _ref: true, _id: 'xyz123', fullName: 'Christopher Nolan'}
    });

    // Will fetch 'Movie' only
    movie = store.get(
      {_type: 'Movie', _id: 'abc123'},
      {return: {_id: true, title: true, director: {_id: true}}}
    );
    expect(movie).toEqual({
      _id: 'abc123',
      title: 'Inception',
      director: {_id: 'xyz123'}
    });
  });
});

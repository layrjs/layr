import {MemoryStore} from '../../..';

describe('@superstore/memory-store', () => {
  test('CRUD operations', () => {
    const store = new MemoryStore();

    // Create
    store.set({_type: 'Movie', _id: 'abc123', title: 'Inception', genre: 'action'});

    // Read
    let movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({_type: 'Movie', _id: 'abc123', title: 'Inception', genre: 'action'});
    movie = store.get({_type: 'Movie', _id: 'abc123'}, {return: {title: true}}); // Partial read
    expect(movie).toEqual({title: 'Inception'});
    movie = store.get({_type: 'Movie', _id: 'xyz123'}); // Missing document
    expect(movie).toBeUndefined();
    movie = store.get({_type: 'Person', _id: 'xyz123'}); // Missing collection
    expect(movie).toBeUndefined();

    // Update
    store.set({_type: 'Movie', _id: 'abc123', title: 'The Matrix', genre: undefined});
    movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({_type: 'Movie', _id: 'abc123', title: 'The Matrix'});
    expect(Object.keys(movie).includes('genre')).toBe(false); // 'genre' has been deleted

    // Remove
    let hasBeenDeleted = store.delete({_type: 'Movie', _id: 'abc123'});
    expect(hasBeenDeleted).toBe(true);
    movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toBeUndefined();
    hasBeenDeleted = store.delete({_type: 'Movie', _id: 'abc123'});
    expect(hasBeenDeleted).toBe(false);
  });

  test.skip('References', () => {
    const store = new MemoryStore();

    // Let's set both a 'Movie' and a 'Person'
    store.set({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      director: {_type: 'Person', _id: 'xyz123', fullName: 'Christopher Nolan'}
    });

    // The director can be fetched from 'Person'
    let person = store.get({_type: 'Person', _id: 'xyz123'});
    expect(person).toEqual({_type: 'Person', _id: 'xyz123', fullName: 'Christopher Nolan'});

    // Will fetch both 'Movie' and 'Person'
    let movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      director: {_type: 'Person', _id: 'xyz123', fullName: 'Christopher Nolan'}
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

    // The director can be modified through its parent 'Movie'
    store.set({
      _type: 'Movie',
      _id: 'abc123',
      director: {_type: 'Person', _id: 'xyz123', fullName: 'C. Nolan'}
    });
    person = store.get({_type: 'Person', _id: 'xyz123'}, {return: {fullName: true}});
    expect(person).toEqual({fullName: 'C. Nolan'});
  });
});

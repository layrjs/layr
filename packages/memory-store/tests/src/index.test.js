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
    expect(movie).toEqual({_type: 'Movie', _id: 'abc123', title: 'Inception'});
    movie = store.get({_type: 'Movie', _id: 'abc123'}, {return: false}); // Existence check
    expect(movie).toEqual({_type: 'Movie', _id: 'abc123'});
    movie = store.get({_type: 'Movie', _id: 'xyz123'}); // Missing document
    expect(movie).toBeUndefined();
    movie = store.get({_type: 'Person', _id: 'xyz123'}); // Missing collection
    expect(movie).toBeUndefined();

    // Update
    store.set({_type: 'Movie', _id: 'abc123', title: 'The Matrix', genre: undefined});
    movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({_type: 'Movie', _id: 'abc123', title: 'The Matrix'});
    expect(Object.keys(movie).includes('genre')).toBe(false); // 'genre' has been deleted

    // Delete
    let hasBeenDeleted = store.delete({_type: 'Movie', _id: 'abc123'});
    expect(hasBeenDeleted).toBe(true);
    movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toBeUndefined();
    hasBeenDeleted = store.delete({_type: 'Movie', _id: 'abc123'});
    expect(hasBeenDeleted).toBe(false);
  });

  test('Nesting documents', () => {
    const store = new MemoryStore();

    store.set({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      technicalSpecs: {_type: 'TechnicalSpecs', runtime: 120, aspectRatio: '2.39:1'}
    });

    let movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      technicalSpecs: {_type: 'TechnicalSpecs', runtime: 120, aspectRatio: '2.39:1'}
    });

    // We cannot partially return nested documents
    expect(() => {
      movie = store.get(
        {_type: 'Movie', _id: 'abc123'},
        {return: {technicalSpecs: {runtime: true}}}
      );
    }).toThrow();

    // We cannot partially modify nested documents
    store.set({
      _type: 'Movie',
      _id: 'abc123',
      technicalSpecs: {_type: 'TechnicalSpecs', runtime: 130}
    });
    movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      technicalSpecs: {_type: 'TechnicalSpecs', runtime: 130} // 'aspectRatio' is gone
    });
  });

  test('Referencing documents', () => {
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
    movie = store.get({_type: 'Movie', _id: 'abc123'}, {return: {title: true}});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception'
    });

    // Will fetch 'Movie' and director's id
    movie = store.get({_type: 'Movie', _id: 'abc123'}, {return: {title: true, director: {}}});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      director: {_type: 'Person', _id: 'xyz123'}
    });

    // The director can be modified through its 'Movie' parent
    store.set({
      _type: 'Movie',
      _id: 'abc123',
      director: {_type: 'Person', _id: 'xyz123', fullName: 'C. Nolan'}
    });
    person = store.get({_type: 'Person', _id: 'xyz123'});
    expect(person).toEqual({_type: 'Person', _id: 'xyz123', fullName: 'C. Nolan'});
  });
});

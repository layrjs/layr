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
    let deleteResult = store.delete({_type: 'Movie', _id: 'abc123'});
    expect(deleteResult).toEqual({_type: 'Movie', _id: 'abc123'});
    movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toBeUndefined();
    deleteResult = store.delete({_type: 'Movie', _id: 'abc123'});
    expect(deleteResult).toEqual({});
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

    store.delete({_type: 'Movie', _id: 'abc123'});
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
    let director = store.get({_type: 'Person', _id: 'xyz123'});
    expect(director).toEqual({_type: 'Person', _id: 'xyz123', fullName: 'Christopher Nolan'});

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
    director = store.get({_type: 'Person', _id: 'xyz123'});
    expect(director).toEqual({_type: 'Person', _id: 'xyz123', fullName: 'C. Nolan'});

    // Will delete both the 'Movie' and its director
    const deleteResult = store.delete({
      _type: 'Movie',
      _id: 'abc123',
      director: {_type: 'Person', _id: 'xyz123'}
    });
    expect(deleteResult).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      director: {_type: 'Person', _id: 'xyz123'}
    });
    movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toBeUndefined();
    director = store.get({_type: 'Person', _id: 'xyz123'});
    expect(director).toBeUndefined();
  });

  test('Arrays', () => {
    const store = new MemoryStore();

    // Let's set both a 'Movie' and a 'Person'
    store.set({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      genres: ['action', 'adventure', 'sci-fi'],
      actors: [
        {_type: 'Person', _id: 'xyz123', fullName: 'Leonardo DiCaprio'},
        {_type: 'Person', _id: 'xyz456', fullName: 'Joseph Gordon-Levitt'}
      ]
    });

    // The actors can be fetched from 'Person'
    let actor = store.get({_type: 'Person', _id: 'xyz123'});
    expect(actor).toEqual({_type: 'Person', _id: 'xyz123', fullName: 'Leonardo DiCaprio'});
    actor = store.get({_type: 'Person', _id: 'xyz456'});
    expect(actor).toEqual({_type: 'Person', _id: 'xyz456', fullName: 'Joseph Gordon-Levitt'});

    // Will fetch both 'Movie' and 'Person'
    let movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      genres: ['action', 'adventure', 'sci-fi'],
      actors: [
        {_type: 'Person', _id: 'xyz123', fullName: 'Leonardo DiCaprio'},
        {_type: 'Person', _id: 'xyz456', fullName: 'Joseph Gordon-Levitt'}
      ]
    });

    // Will fetch 'Movie' only
    movie = store.get({_type: 'Movie', _id: 'abc123'}, {return: {title: true}});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception'
    });

    // Will fetch 'Movie' and actors' id
    movie = store.get({_type: 'Movie', _id: 'abc123'}, {return: {title: true, actors: [{}]}});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      actors: [{_type: 'Person', _id: 'xyz123'}, {_type: 'Person', _id: 'xyz456'}]
    });

    // Everything can be modified through 'Movie'
    store.set({
      _type: 'Movie',
      _id: 'abc123',
      genres: ['action', 'sci-fi'],
      actors: [
        {_type: 'Person', _id: 'xyz123', fullName: 'L. DiCaprio'},
        {_type: 'Person', _id: 'xyz456', fullName: 'J. Gordon-Levitt'}
      ]
    });
    actor = store.get({_type: 'Person', _id: 'xyz123'});
    expect(actor).toEqual({_type: 'Person', _id: 'xyz123', fullName: 'L. DiCaprio'});
    actor = store.get({_type: 'Person', _id: 'xyz456'});
    expect(actor).toEqual({_type: 'Person', _id: 'xyz456', fullName: 'J. Gordon-Levitt'});

    // Will delete both the 'Movie' and its actors
    const deleteResult = store.delete({
      _type: 'Movie',
      _id: 'abc123',
      actors: [{_type: 'Person', _id: 'xyz123'}, {_type: 'Person', _id: 'xyz456'}]
    });
    expect(deleteResult).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      actors: [{_type: 'Person', _id: 'xyz123'}, {_type: 'Person', _id: 'xyz456'}]
    });
    movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toBeUndefined();
    actor = store.get({_type: 'Person', _id: 'xyz123'});
    expect(actor).toBeUndefined();
    actor = store.get({_type: 'Person', _id: 'xyz456'});
    expect(actor).toBeUndefined();
  });
});

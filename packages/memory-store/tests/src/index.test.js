import {MemoryStore} from '../../..';

describe('@storable/memory-store', () => {
  test('CRUD operations', () => {
    const store = new MemoryStore();

    // Create
    expect(() => {
      store.set({_type: 'Movie', _id: 'abc123', title: 'The Matrix'});
    }).toThrow(); // The document doesn't exist yet so 'isNew' is required
    store.set({_new: true, _type: 'Movie', _id: 'abc123', title: 'Inception', genre: 'action'});

    // Read
    let movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({_type: 'Movie', _id: 'abc123', title: 'Inception', genre: 'action'});
    movie = store.get({_type: 'Movie', _id: 'abc123'}, {return: {title: true}}); // Partial read
    expect(movie).toEqual({_type: 'Movie', _id: 'abc123', title: 'Inception'});
    movie = store.get({_type: 'Movie', _id: 'abc123'}, {return: false}); // Existence check
    expect(movie).toEqual({_type: 'Movie', _id: 'abc123'});
    movie = store.get({_type: 'Movie', _id: 'xyz123'}); // Missing document
    expect(movie).toBeUndefined();
    movie = store.get({_type: 'Director', _id: 'xyz123'}); // Missing collection
    expect(movie).toBeUndefined();

    // Update
    store.set({_type: 'Movie', _id: 'abc123', title: 'The Matrix', genre: undefined});
    movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({_type: 'Movie', _id: 'abc123', title: 'The Matrix'});
    expect(Object.keys(movie).includes('genre')).toBe(false); // 'genre' has been deleted
    expect(() => {
      store.set({_new: true, _type: 'Movie', _id: 'abc123', title: 'Inception'});
    }).toThrow(); // The document already exists so 'isNew' should be not be passed

    // Delete
    let result = store.delete({_type: 'Movie', _id: 'abc123'});
    expect(result).toBe(true);
    movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toBeUndefined();
    result = store.delete({_type: 'Movie', _id: 'abc123'});
    expect(result).toBe(false);
  });

  test('Nesting documents', () => {
    const store = new MemoryStore();

    store.set({
      _new: true,
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      technicalSpecs: {
        _new: true,
        _type: 'TechnicalSpecs',
        _id: 'xyz789',
        runtime: 120,
        aspectRatio: '2.39:1'
      }
    });

    let movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      technicalSpecs: {_type: 'TechnicalSpecs', _id: 'xyz789', runtime: 120, aspectRatio: '2.39:1'}
    });

    // We can partially return nested documents
    movie = store.get({_type: 'Movie', _id: 'abc123'}, {return: {technicalSpecs: {runtime: true}}});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      technicalSpecs: {_type: 'TechnicalSpecs', _id: 'xyz789', runtime: 120}
    });

    // We can partially modify nested documents
    store.set({
      _type: 'Movie',
      _id: 'abc123',
      technicalSpecs: {_type: 'TechnicalSpecs', _id: 'xyz789', runtime: 130}
    });
    movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      technicalSpecs: {_type: 'TechnicalSpecs', _id: 'xyz789', runtime: 130, aspectRatio: '2.39:1'}
    });

    store.delete({_type: 'Movie', _id: 'abc123'});
  });

  test('Referencing documents', () => {
    const store = new MemoryStore();

    // Let's set a movie and a director
    store.set({
      _new: true,
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      director: {_type: 'Director', _id: 'xyz123', _ref: true}
    });
    store.set({_new: true, _type: 'Director', _id: 'xyz123', fullName: 'Christopher Nolan'});

    // The director can be fetched from 'Director'
    let director = store.get({_type: 'Director', _id: 'xyz123'});
    expect(director).toEqual({_type: 'Director', _id: 'xyz123', fullName: 'Christopher Nolan'});

    // Will fetch both the movie and its director
    let movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      director: {_type: 'Director', _id: 'xyz123', _ref: true, fullName: 'Christopher Nolan'}
    });

    // Will fetch the movie only
    movie = store.get({_type: 'Movie', _id: 'abc123'}, {return: {title: true}});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception'
    });

    // Will fetch the movie and the id of its director
    movie = store.get({_type: 'Movie', _id: 'abc123'}, {return: {title: true, director: {}}});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      director: {_type: 'Director', _id: 'xyz123', _ref: true}
    });

    // Let's delete the movie
    let result = store.delete({_type: 'Movie', _id: 'abc123'});
    expect(result).toBe(true);
    movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toBeUndefined(); // The movie is gone
    // But the director is still there
    director = store.get({_type: 'Director', _id: 'xyz123'});
    expect(director).toEqual({_type: 'Director', _id: 'xyz123', fullName: 'Christopher Nolan'});
    // So let's delete it
    result = store.delete({_type: 'Director', _id: 'xyz123'});
    expect(result).toBe(true);
    director = store.get({_type: 'Director', _id: 'xyz123'});
    expect(movie).toBeUndefined(); // The director is gone
  });

  test('Arrays', () => {
    const store = new MemoryStore();

    // Let's set a movie and some actors
    store.set({
      _new: true,
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      genres: ['action', 'adventure', 'sci-fi'],
      actors: [
        {_type: 'Actor', _id: 'xyz123', _ref: true},
        {_type: 'Actor', _id: 'xyz456', _ref: true}
      ]
    });
    store.set({_new: true, _type: 'Actor', _id: 'xyz123', fullName: 'Leonardo DiCaprio'});
    store.set({_new: true, _type: 'Actor', _id: 'xyz456', fullName: 'Joseph Gordon-Levitt'});

    // The actors can be fetched directly
    let actor = store.get({_type: 'Actor', _id: 'xyz123'});
    expect(actor).toEqual({_type: 'Actor', _id: 'xyz123', fullName: 'Leonardo DiCaprio'});
    actor = store.get({_type: 'Actor', _id: 'xyz456'});
    expect(actor).toEqual({_type: 'Actor', _id: 'xyz456', fullName: 'Joseph Gordon-Levitt'});

    // Will fetch both the movie and its actors
    let movie = store.get({_type: 'Movie', _id: 'abc123'});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      genres: ['action', 'adventure', 'sci-fi'],
      actors: [
        {_type: 'Actor', _id: 'xyz123', _ref: true, fullName: 'Leonardo DiCaprio'},
        {_type: 'Actor', _id: 'xyz456', _ref: true, fullName: 'Joseph Gordon-Levitt'}
      ]
    });

    // Will fetch the movie only
    movie = store.get({_type: 'Movie', _id: 'abc123'}, {return: {title: true}});
    expect(movie).toEqual({_type: 'Movie', _id: 'abc123', title: 'Inception'});

    // Will fetch the movie and the id of the actors
    movie = store.get({_type: 'Movie', _id: 'abc123'}, {return: {title: true, actors: [{}]}});
    expect(movie).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      actors: [
        {_type: 'Actor', _id: 'xyz123', _ref: true},
        {_type: 'Actor', _id: 'xyz456', _ref: true}
      ]
    });

    // Let's delete everything
    let result = store.delete({_type: 'Movie', _id: 'abc123'});
    expect(result).toBe(true);
    result = store.delete({_type: 'Actor', _id: 'xyz123'});
    expect(result).toBe(true);
    result = store.delete({_type: 'Actor', _id: 'xyz456'});
    expect(result).toBe(true);
  });

  test('Multi CRUD operations', () => {
    const store = new MemoryStore();

    // Create
    store.set([
      {_new: true, _type: 'Movie', _id: 'abc123', title: 'Inception'},
      {_new: true, _type: 'Movie', _id: 'abc456', title: 'The Matrix'}
    ]);

    // Read
    let movies = store.get([{_type: 'Movie', _id: 'abc123'}, {_type: 'Movie', _id: 'abc456'}]);
    expect(movies).toEqual([
      {_type: 'Movie', _id: 'abc123', title: 'Inception'},
      {_type: 'Movie', _id: 'abc456', title: 'The Matrix'}
    ]);

    // Update
    store.set([
      {_type: 'Movie', _id: 'abc123', rating: 8.8},
      {_type: 'Movie', _id: 'abc456', rating: 8.7}
    ]);
    movies = store.get([{_type: 'Movie', _id: 'abc123'}, {_type: 'Movie', _id: 'abc456'}]);
    expect(movies).toEqual([
      {_type: 'Movie', _id: 'abc123', title: 'Inception', rating: 8.8},
      {_type: 'Movie', _id: 'abc456', title: 'The Matrix', rating: 8.7}
    ]);

    // Delete
    let result = store.delete([{_type: 'Movie', _id: 'abc123'}, {_type: 'Movie', _id: 'abc456'}]);
    expect(result).toEqual([true, true]);
    movies = store.get([{_type: 'Movie', _id: 'abc123'}, {_type: 'Movie', _id: 'abc456'}]);
    expect(movies).toEqual([undefined, undefined]);
    result = store.delete([{_type: 'Movie', _id: 'abc123'}, {_type: 'Movie', _id: 'abc456'}]);
    expect(result).toEqual([false, false]);
  });

  test('Finding documents', () => {
    const store = new MemoryStore();

    store.set([
      {
        _new: true,
        _type: 'Movie',
        _id: 'movie1',
        title: 'Inception',
        genre: 'action',
        country: 'USA'
      },
      {
        _new: true,
        _type: 'Movie',
        _id: 'movie2',
        title: 'Forrest Gump',
        genre: 'drama',
        country: 'USA'
      },
      {
        _new: true,
        _type: 'Movie',
        _id: 'movie3',
        title: 'Léon',
        genre: 'action',
        country: 'France'
      }
    ]);

    let movies = store.find({_type: 'Movie'});
    expect(movies.map(movie => movie._id)).toEqual(['movie1', 'movie2', 'movie3']);

    movies = store.find({_type: 'Movie', genre: 'action'});
    expect(movies.map(movie => movie._id)).toEqual(['movie1', 'movie3']);

    movies = store.find({_type: 'Movie', genre: 'action', country: 'France'});
    expect(movies.map(movie => movie._id)).toEqual(['movie3']);

    movies = store.find({_type: 'Movie', genre: 'adventure'});
    expect(movies.map(movie => movie._id)).toEqual([]);

    movies = store.find({_type: 'Movie'}, {skip: 1, limit: 1});
    expect(movies.map(movie => movie._id)).toEqual(['movie2']);

    movies = store.find({_type: 'Movie'}, {return: {title: true}});
    expect(movies).toEqual([
      {_type: 'Movie', _id: 'movie1', title: 'Inception'},
      {_type: 'Movie', _id: 'movie2', title: 'Forrest Gump'},
      {_type: 'Movie', _id: 'movie3', title: 'Léon'}
    ]);
  });
});

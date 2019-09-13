import {MongoMemoryServer} from 'mongodb-memory-server';

import {MongoDBStore} from '../../..';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 3 * 60 * 1000; // 3 minutes

let server;
let store;

beforeEach(async () => {
  server = new MongoMemoryServer();
  const connectionString = await server.getConnectionString();
  store = new MongoDBStore(connectionString);
  await store.connect();
});

afterEach(async () => {
  await store.disconnect();
  await server.stop();
});

describe('MongoDBStore', () => {
  test('CRUD operations', async () => {
    // Create
    let acknowledgement = await store.save([
      {
        _type: 'Movie',
        _new: true,
        _id: 'abc123',
        title: 'Inception',
        year: 2010,
        releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'}
      }
    ]);
    expect(acknowledgement).toEqual([
      {
        _type: 'Movie',
        _id: 'abc123',
        title: 'Inception',
        year: 2010,
        releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'}
      }
    ]);

    // Read
    let movies = await store.load([{_type: 'Movie', _id: 'abc123'}]);
    expect(movies).toEqual([
      {
        _type: 'Movie',
        _id: 'abc123',
        title: 'Inception',
        year: 2010,
        releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'}
      }
    ]);

    // Partial read
    movies = await store.load([{_type: 'Movie', _id: 'abc123'}], {fields: {title: true}});
    expect(movies).toEqual([{_type: 'Movie', _id: 'abc123', title: 'Inception'}]);

    // Existence check
    movies = await store.load([{_type: 'Movie', _id: 'abc123'}], {fields: {}});
    expect(movies).toEqual([{_type: 'Movie', _id: 'abc123'}]);

    // Missing document
    expect(store.load([{_type: 'Movie', _id: 'xyz123'}])).rejects.toThrow(/Document not found/);
    movies = await store.load([{_type: 'Movie', _id: 'xyz123'}], {throwIfNotFound: false});
    expect(movies).toEqual([{_type: 'Movie', _id: 'xyz123', _missed: true}]);
    expect(store.save([{_type: 'Movie', _id: 'xyz123', title: 'The Matrix'}])).rejects.toThrow(
      /Document not found/
    ); // Since the document doesn't exist yet, '_new' should be specified
    acknowledgement = await store.save([{_type: 'Movie', _id: 'xyz123', title: 'The Matrix'}], {
      throwIfNotFound: false
    });
    expect(acknowledgement).toEqual([
      {_type: 'Movie', _id: 'xyz123', _missed: true, title: 'The Matrix'}
    ]);
    movies = await store.load([{_type: 'Movie', _id: 'xyz123'}]);
    expect(movies).toEqual([{_type: 'Movie', _id: 'xyz123', title: 'The Matrix'}]);

    // Update
    acknowledgement = await store.save([
      {_type: 'Movie', _id: 'abc123', title: 'The Matrix', year: null}
    ]);
    expect(acknowledgement).toEqual([
      {_type: 'Movie', _id: 'abc123', title: 'The Matrix', year: null}
    ]); // 'year' is still there
    movies = await store.load([{_type: 'Movie', _id: 'abc123'}]);
    expect(movies).toEqual([
      {
        _type: 'Movie',
        _id: 'abc123',
        title: 'The Matrix',
        releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'}
      }
    ]); // 'year' has been deleted

    // Already existing document
    expect(
      store.save([{_type: 'Movie', _new: true, _id: 'abc123', title: 'Inception'}])
    ).rejects.toThrow(/Document already exists/); // Since the document already exists, '_new' shouldn't be specified
    acknowledgement = await store.save(
      [{_type: 'Movie', _new: true, _id: 'abc123', title: 'Inception'}],
      {
        throwIfAlreadyExists: false
      }
    );
    expect(acknowledgement).toEqual([
      {_type: 'Movie', _id: 'abc123', _existed: true, title: 'Inception'}
    ]);

    // Delete
    acknowledgement = await store.delete([
      {_type: 'Movie', _id: 'abc123'},
      {_type: 'Movie', _id: 'xyz123'}
    ]);
    expect(acknowledgement).toEqual([
      {_type: 'Movie', _id: 'abc123'},
      {_type: 'Movie', _id: 'xyz123'}
    ]);
    movies = await store.load([{_type: 'Movie', _id: 'abc123'}, {_type: 'Movie', _id: 'xyz123'}], {
      throwIfNotFound: false
    });
    expect(movies).toEqual([
      {_type: 'Movie', _id: 'abc123', _missed: true},
      {_type: 'Movie', _id: 'xyz123', _missed: true}
    ]);
    expect(
      store.delete([{_type: 'Movie', _id: 'abc123'}, {_type: 'Movie', _id: 'xyz123'}])
    ).rejects.toThrow(/Document not found/);
    acknowledgement = await store.delete(
      [{_type: 'Movie', _id: 'abc123'}, {_type: 'Movie', _id: 'xyz123'}],
      {throwIfNotFound: false}
    );
    expect(acknowledgement).toEqual([
      {_type: 'Movie', _id: 'abc123', _missed: true},
      {_type: 'Movie', _id: 'xyz123', _missed: true}
    ]);
  });

  test('Finding documents', async () => {
    await store.save([
      {
        _type: 'Movie',
        _new: true,
        _id: 'movie1',
        title: 'Inception',
        genre: 'action',
        country: 'USA'
      },
      {
        _type: 'Movie',
        _new: true,
        _id: 'movie2',
        title: 'Forrest Gump',
        genre: 'drama',
        country: 'USA'
      },
      {
        _type: 'Movie',
        _new: true,
        _id: 'movie3',
        title: 'Léon',
        genre: 'action',
        country: 'France'
      }
    ]);

    let movies = await store.find({_type: 'Movie'});
    expect(movies.map(movie => movie._id)).toEqual(['movie1', 'movie2', 'movie3']);

    movies = await store.find({_type: 'Movie', genre: 'action'});
    expect(movies.map(movie => movie._id)).toEqual(['movie1', 'movie3']);

    movies = await store.find({_type: 'Movie', genre: 'action', country: 'France'});
    expect(movies.map(movie => movie._id)).toEqual(['movie3']);

    movies = await store.find({_type: 'Movie', genre: 'adventure'});
    expect(movies.map(movie => movie._id)).toEqual([]);

    movies = await store.find({_type: 'Movie'}, {skip: 1, limit: 1});
    expect(movies.map(movie => movie._id)).toEqual(['movie2']);

    movies = await store.find({_type: 'Movie'}, {fields: {title: true}});
    expect(movies).toEqual([
      {_type: 'Movie', _id: 'movie1', title: 'Inception'},
      {_type: 'Movie', _id: 'movie2', title: 'Forrest Gump'},
      {_type: 'Movie', _id: 'movie3', title: 'Léon'}
    ]);

    await store.delete([
      {_type: 'Movie', _id: 'movie1'},
      {_type: 'Movie', _id: 'movie2'},
      {_type: 'Movie', _id: 'movie3'}
    ]);
  });
});

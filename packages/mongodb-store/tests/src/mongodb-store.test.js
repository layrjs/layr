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
      {_type: 'Movie', _new: true, _id: 'abc123', title: 'Inception', year: 2010}
    ]);
    expect(acknowledgement).toEqual([
      {_type: 'Movie', _id: 'abc123', title: 'Inception', year: 2010}
    ]);

    // Read
    let movies = await store.load([{_type: 'Movie', _id: 'abc123'}]);
    expect(movies).toEqual([{_type: 'Movie', _id: 'abc123', title: 'Inception', year: 2010}]);

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
      {_type: 'Movie', _id: 'abc123', title: 'The Matrix', year: undefined}
    ]);
    expect(acknowledgement).toEqual([
      {_type: 'Movie', _id: 'abc123', title: 'The Matrix', year: undefined}
    ]);
    expect(Object.keys(acknowledgement[0]).includes('year')).toBe(true); // 'year' is still there
    movies = await store.load([{_type: 'Movie', _id: 'abc123'}]);
    expect(movies).toEqual([{_type: 'Movie', _id: 'abc123', title: 'The Matrix'}]);
    expect(Object.keys(movies[0]).includes('year')).toBe(false); // 'year' has been deleted

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
});

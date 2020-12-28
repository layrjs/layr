import {Component} from '@layr/component';
import {
  Storable,
  StorableComponent,
  primaryIdentifier,
  secondaryIdentifier,
  attribute
} from '@layr/storable';
import {MongoDBStore} from '@layr/mongodb-store';
import {MongoMemoryServer} from 'mongodb-memory-server';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60 * 1000; // 1 minute

describe('Storable Migration', () => {
  let movieClass: typeof StorableComponent;
  let server: MongoMemoryServer;
  let store: MongoDBStore;

  beforeEach(async () => {
    class Movie extends Storable(Component) {
      @primaryIdentifier() id!: string;

      @secondaryIdentifier() slug!: string;

      @attribute('string') title!: string;
    }

    movieClass = Movie;

    server = new MongoMemoryServer();

    const connectionString = await server.getUri();

    store = new MongoDBStore(connectionString);

    store.registerRootComponent(Movie);

    await store.connect();
  });

  afterEach(async () => {
    await store?.disconnect();

    await server?.stop();
  });

  test('migrateStorables()', async () => {
    let result = await store.migrateStorables({silent: true});

    expect(result).toStrictEqual({
      collections: [{name: 'Movie', createdIndexes: ['slug [unique]'], droppedIndexes: []}]
    });

    result = await store.migrateStorables({silent: true});

    expect(result).toStrictEqual({
      collections: [{name: 'Movie', createdIndexes: [], droppedIndexes: []}]
    });

    movieClass.prototype.deleteProperty('slug');

    result = await store.migrateStorables({silent: true});

    expect(result).toStrictEqual({
      collections: [{name: 'Movie', createdIndexes: [], droppedIndexes: ['slug [unique]']}]
    });
  });
});

import {Component, provide} from '@layr/component';
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
    class Person extends Storable(Component) {
      @primaryIdentifier() id!: string;

      @attribute('string') fullName!: string;
    }

    class Movie extends Storable(Component) {
      @provide() static Person = Person;

      @primaryIdentifier() id!: string;

      @secondaryIdentifier() slug!: string;

      @attribute('string') title!: string;

      @attribute('number') year!: number;

      @attribute('Person') director!: Person;
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
      collections: [
        {name: 'Movie', createdIndexes: ['slug [unique]', 'director.id'], droppedIndexes: []},
        {name: 'Person', createdIndexes: [], droppedIndexes: []}
      ]
    });

    result = await store.migrateStorables({silent: true});

    expect(result).toStrictEqual({
      collections: [
        {name: 'Movie', createdIndexes: [], droppedIndexes: []},
        {name: 'Person', createdIndexes: [], droppedIndexes: []}
      ]
    });

    movieClass.prototype.deleteProperty('slug');

    result = await store.migrateStorables({silent: true});

    expect(result).toStrictEqual({
      collections: [
        {name: 'Movie', createdIndexes: [], droppedIndexes: ['slug [unique]']},
        {name: 'Person', createdIndexes: [], droppedIndexes: []}
      ]
    });

    movieClass.prototype.setIndex({title: 'asc'});

    result = await store.migrateStorables({silent: true});

    expect(result).toStrictEqual({
      collections: [
        {name: 'Movie', createdIndexes: ['title'], droppedIndexes: []},
        {name: 'Person', createdIndexes: [], droppedIndexes: []}
      ]
    });

    movieClass.prototype.setIndex({title: 'asc'}, {isUnique: true});

    result = await store.migrateStorables({silent: true});

    expect(result).toStrictEqual({
      collections: [
        {name: 'Movie', createdIndexes: ['title [unique]'], droppedIndexes: ['title']},
        {name: 'Person', createdIndexes: [], droppedIndexes: []}
      ]
    });

    movieClass.prototype.deleteIndex({title: 'asc'});

    result = await store.migrateStorables({silent: true});

    expect(result).toStrictEqual({
      collections: [
        {name: 'Movie', createdIndexes: [], droppedIndexes: ['title [unique]']},
        {name: 'Person', createdIndexes: [], droppedIndexes: []}
      ]
    });

    movieClass.prototype.setIndex({year: 'desc', title: 'asc'}, {isUnique: true});

    result = await store.migrateStorables({silent: true});

    expect(result).toStrictEqual({
      collections: [
        {name: 'Movie', createdIndexes: ['year (desc) + title [unique]'], droppedIndexes: []},
        {name: 'Person', createdIndexes: [], droppedIndexes: []}
      ]
    });
  });
});

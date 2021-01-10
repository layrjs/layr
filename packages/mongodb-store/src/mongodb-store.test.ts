import {Component, provide} from '@layr/component';
import {
  Storable,
  StorableComponent,
  primaryIdentifier,
  secondaryIdentifier,
  attribute
} from '@layr/storable';
import {MongoMemoryServer} from 'mongodb-memory-server';

import {MongoDBStore} from './mongodb-store';

describe('MongoDBStore', () => {
  describe('Migration', () => {
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

      movieClass.prototype.setIndex({year: 'asc', id: 'asc'});

      result = await store.migrateStorables({silent: true});

      expect(result).toStrictEqual({
        collections: [
          {name: 'Movie', createdIndexes: ['year + _id'], droppedIndexes: []},
          {name: 'Person', createdIndexes: [], droppedIndexes: []}
        ]
      });
    });
  });

  describe('Document operations', () => {
    let server: MongoMemoryServer;
    let store: MongoDBStore;

    beforeEach(async () => {
      server = new MongoMemoryServer({instance: {storageEngine: 'wiredTiger'}});

      const connectionString = await server.getUri();

      store = new MongoDBStore(connectionString);

      await store.connect();

      await store.migrateCollection({
        collectionName: 'Movie',
        collectionSchema: {
          indexes: [
            {attributes: {_id: 'asc'}, isPrimary: true, isUnique: true},
            {attributes: {slug: 'asc'}, isPrimary: false, isUnique: true},
            {attributes: {title: 'asc'}, isPrimary: false, isUnique: false},
            {attributes: {year: 'desc'}, isPrimary: false, isUnique: false},
            {attributes: {year: 'desc', title: 'asc'}, isPrimary: false, isUnique: true}
          ]
        },
        silent: true
      });
    });

    afterEach(async () => {
      await store?.disconnect();

      await server?.stop();
    });

    test('createDocument()', async () => {
      expect(
        await store.createDocument({
          collectionName: 'Movie',
          identifierDescriptor: {_id: 'movie1'},
          document: {
            __component: 'Movie',
            _id: 'movie1',
            slug: 'inception',
            title: 'Inception',
            year: 2010
          }
        })
      ).toBe(true);

      expect(
        await store.createDocument({
          collectionName: 'Movie',
          identifierDescriptor: {_id: 'movie1'},
          document: {
            __component: 'Movie',
            _id: 'movie1',
            slug: 'inception-2',
            title: 'Inception 2',
            year: 2010
          }
        })
      ).toBe(false);

      await expect(
        store.createDocument({
          collectionName: 'Movie',
          identifierDescriptor: {_id: 'movie1'},
          document: {
            __component: 'Movie',
            _id: 'movie2',
            slug: 'inception',
            title: 'Inception',
            year: 2010
          }
        })
      ).rejects.toThrow(
        "A duplicate key error occurred while creating a MongoDB document (collection: 'Movie', index: 'slug [unique]')"
      );

      await expect(
        store.createDocument({
          collectionName: 'Movie',
          identifierDescriptor: {_id: 'movie1'},
          document: {
            __component: 'Movie',
            _id: 'movie2',
            slug: 'inception-2',
            title: 'Inception',
            year: 2010
          }
        })
      ).rejects.toThrow(
        "A duplicate key error occurred while creating a MongoDB document (collection: 'Movie', index: 'year (desc) + title [unique]')"
      );
    });

    test('updateDocument()', async () => {
      await store.createDocument({
        collectionName: 'Movie',
        identifierDescriptor: {_id: 'movie1'},
        document: {
          __component: 'Movie',
          _id: 'movie1',
          slug: 'inception',
          title: 'Inception',
          year: 2010
        }
      });

      await store.createDocument({
        collectionName: 'Movie',
        identifierDescriptor: {_id: 'movie2'},
        document: {
          __component: 'Movie',
          _id: 'movie2',
          slug: 'inception-2',
          title: 'Inception 2',
          year: 2020
        }
      });

      expect(
        await store.updateDocument({
          collectionName: 'Movie',
          identifierDescriptor: {_id: 'movie2'},
          documentPatch: {$set: {year: 2021}}
        })
      ).toBe(true);

      expect(
        await store.updateDocument({
          collectionName: 'Movie',
          identifierDescriptor: {_id: 'movie3'},
          documentPatch: {$set: {year: 2021}}
        })
      ).toBe(false);

      await expect(
        store.updateDocument({
          collectionName: 'Movie',
          identifierDescriptor: {_id: 'movie2'},
          documentPatch: {$set: {slug: 'inception'}}
        })
      ).rejects.toThrow(
        "A duplicate key error occurred while updating a MongoDB document (collection: 'Movie', index: 'slug [unique]')"
      );

      await expect(
        store.updateDocument({
          collectionName: 'Movie',
          identifierDescriptor: {_id: 'movie2'},
          documentPatch: {$set: {title: 'Inception', year: 2010}}
        })
      ).rejects.toThrow(
        "A duplicate key error occurred while updating a MongoDB document (collection: 'Movie', index: 'year (desc) + title [unique]')"
      );
    });
  });
});

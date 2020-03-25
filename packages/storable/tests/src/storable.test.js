import {MongoDBStore} from '@liaison/mongodb-store';
import {MongoClient} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {ComponentClient} from '@liaison/component-client';
import {ComponentServer} from '@liaison/component-server';
import mapKeys from 'lodash/mapKeys';
import {deleteUndefinedProperties} from 'core-helpers';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60 * 1000; // 1 minute

import {
  Storable,
  isStorableClass,
  isStorableInstance,
  primaryIdentifier,
  secondaryIdentifier,
  attribute,
  expose,
  inherit,
  serialize
} from '../../..';
import {MockStore} from './mock-store';

describe('Storable', () => {
  const CREATED_ON = new Date('2020-03-22T01:27:42.612Z');
  const UPDATED_ON = new Date('2020-03-22T01:29:33.673Z');

  class BaseUser extends Storable {
    @primaryIdentifier() id;
    @secondaryIdentifier() email;
    @secondaryIdentifier('number') reference;
    @attribute('string') fullName = '';
    @attribute('number') accessLevel = 0;
    @attribute('boolean') emailIsVerified = false;
    @attribute('date') createdOn = new Date('2020-03-22T01:27:42.612Z');
    @attribute('date?') updatedOn;
  }

  test('isStorableClass()', async () => {
    class User extends BaseUser {}

    expect(isStorableClass(User)).toBe(true);
    expect(isStorableClass(User.prototype)).toBe(false);

    const user = new User({id: 'user1', email: '1@user.com', reference: 1});

    expect(isStorableClass(user)).toBe(false);
  });

  test('isStorableInstance()', async () => {
    class User extends BaseUser {}

    expect(isStorableInstance(User)).toBe(false);
    expect(isStorableInstance(User.prototype)).toBe(true);

    const user = new User({id: 'user1', email: '1@user.com', reference: 1});

    expect(isStorableInstance(user)).toBe(true);
  });

  test('getStore() and hasStore()', async () => {
    class User extends BaseUser {}

    expect(User.hasStore()).toBe(false);
    expect(() => User.getStore()).toThrow(
      "Cannot get the store of a storable that is not registered in any store (storable name: 'User')"
    );

    const store = new MockStore([User]);

    expect(User.hasStore()).toBe(true);
    expect(User.getStore()).toBe(store);
  });

  describe('With a local mock store', () => {
    testOperations(function() {
      class User extends BaseUser {}

      // eslint-disable-next-line no-unused-vars
      const store = new MockStore([User], {initialCollections: getInitialCollections()});

      return User;
    });
  });

  describe('With a local MongoDB store', () => {
    let User;
    let server;
    let store;

    beforeEach(async () => {
      User = class User extends BaseUser {};

      server = new MongoMemoryServer();

      const connectionString = await server.getConnectionString();

      await seedMongoDB(connectionString);

      store = new MongoDBStore([User], {connectionString});

      await store.connect();
    });

    afterEach(async () => {
      await store?.disconnect();

      await server?.stop();
    });

    testOperations(function() {
      return User;
    });
  });

  describe('With a remote mock store', () => {
    testOperations(() => {
      const server = (() => {
        class User extends BaseUser {
          @expose({get: true, set: true}) @inherit() id;
          @expose({get: true, set: true}) @inherit() email;
          @expose({get: true, set: true}) @inherit() reference;
          @expose({get: true, set: true}) @inherit() fullName;
          @expose({get: true, set: true}) @inherit() accessLevel;
          @expose({get: true, set: true}) @inherit() emailIsVerified;
          @expose({get: true, set: true}) @inherit() createdOn;
          @expose({get: true, set: true}) @inherit() updatedOn;

          @expose({call: true}) @inherit() load;
          @expose({call: true}) @inherit() save;
          @expose({call: true}) @inherit() delete;
          @expose({call: true}) @inherit() static find;
          @expose({call: true}) @inherit() static count;
        }

        // eslint-disable-next-line no-unused-vars
        const store = new MockStore([User], {initialCollections: getInitialCollections()});

        return new ComponentServer([User]);
      })();

      const client = new ComponentClient(server, {baseComponents: [Storable]});
      const [User] = client.getComponents();

      return User;
    });
  });

  describe('Without a store', () => {
    testOperations(function() {
      class User extends BaseUser {}

      return User;
    });
  });

  function getInitialCollections() {
    return {
      User: [
        {
          __component: 'user',
          id: 'user1',
          email: '1@user.com',
          reference: 1,
          fullName: 'User 1',
          accessLevel: 0,
          emailIsVerified: false,
          createdOn: CREATED_ON,
          updatedOn: undefined
        },
        {
          __component: 'user',
          id: 'user11',
          email: '11@user.com',
          reference: 11,
          fullName: 'User 11',
          accessLevel: 3,
          emailIsVerified: true,
          createdOn: CREATED_ON,
          updatedOn: undefined
        },
        {
          __component: 'user',
          id: 'user12',
          email: '12@user.com',
          reference: 12,
          fullName: 'User 12',
          accessLevel: 1,
          emailIsVerified: true,
          createdOn: CREATED_ON,
          updatedOn: undefined
        },
        {
          __component: 'user',
          id: 'user13',
          email: '13@user.com',
          reference: 13,
          fullName: 'User 13',
          accessLevel: 3,
          emailIsVerified: false,
          createdOn: CREATED_ON,
          updatedOn: undefined
        }
      ]
    };
  }

  async function seedMongoDB(connectionString) {
    const client = await MongoClient.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const initialCollections = getInitialCollections();

    for (const [collectionName, serializedStorables] of Object.entries(initialCollections)) {
      const collection = client.db().collection(collectionName);

      for (const serializedStorable of serializedStorables) {
        const document = mapKeys(serializedStorable, (_, name) => (name === 'id' ? '_id' : name));
        deleteUndefinedProperties(document);
        await collection.insertOne(document);
      }
    }

    await client.close();
  }

  function testOperations(userClassProvider) {
    describe('Storable instances', () => {
      test('get()', async () => {
        const User = userClassProvider();

        if (!(User.hasStore() || User.getRemoteComponent() !== undefined)) {
          return await expect(User.fork().get({id: 'user1'})).rejects.toThrow(
            "To be able to execute the load() method (called from get()), a storable should be registered in a store or have an exposed load() remote method (storable name: 'user')"
          );
        }

        let user = await User.fork().get('user1');

        expect(user.serialize()).toStrictEqual({
          __component: 'user',
          id: 'user1',
          email: '1@user.com',
          reference: 1,
          fullName: 'User 1',
          accessLevel: 0,
          emailIsVerified: false,
          createdOn: {__date: CREATED_ON.toISOString()},
          updatedOn: {__undefined: true}
        });

        user = await User.fork().get({id: 'user1'});

        expect(user.serialize()).toStrictEqual({
          __component: 'user',
          id: 'user1',
          email: '1@user.com',
          reference: 1,
          fullName: 'User 1',
          accessLevel: 0,
          emailIsVerified: false,
          createdOn: {__date: CREATED_ON.toISOString()},
          updatedOn: {__undefined: true}
        });

        user = await User.fork().get({id: 'user1'}, {fullName: true});

        expect(user.serialize()).toStrictEqual({
          __component: 'user',
          id: 'user1',
          fullName: 'User 1'
        });

        user = await User.fork().get({id: 'user1'}, {});

        expect(user.serialize()).toStrictEqual({__component: 'user', id: 'user1'});

        await expect(User.fork().get({id: 'user2'})).rejects.toThrow(
          "Cannot load a document that is missing from the store (collection: 'User', id: 'user2')"
        );

        expect(await User.fork().get({id: 'user2'}, true, {throwIfMissing: false})).toBeUndefined();

        user = await User.fork().get({email: '1@user.com'});

        expect(user.serialize()).toStrictEqual({
          __component: 'user',
          id: 'user1',
          email: '1@user.com',
          reference: 1,
          fullName: 'User 1',
          accessLevel: 0,
          emailIsVerified: false,
          createdOn: {__date: CREATED_ON.toISOString()},
          updatedOn: {__undefined: true}
        });

        user = await User.fork().get({email: '1@user.com'}, {fullName: true});

        expect(user.serialize()).toStrictEqual({
          __component: 'user',
          id: 'user1',
          email: '1@user.com',
          fullName: 'User 1'
        });

        await expect(User.fork().get({email: '2@user.com'})).rejects.toThrow(
          "Cannot load a document that is missing from the store (collection: 'User', email: '2@user.com')"
        );

        user = await User.fork().get({reference: 1}, {fullName: true});

        expect(user.serialize()).toStrictEqual({
          __component: 'user',
          id: 'user1',
          reference: 1,
          fullName: 'User 1'
        });

        await expect(User.fork().get({reference: 2})).rejects.toThrow(
          "Cannot load a document that is missing from the store (collection: 'User', reference: 2)"
        );

        await expect(User.fork().get({fullName: 'User 1'})).rejects.toThrow(
          "A property with the specified name was found, but it is not an identifier attribute (storable name: 'user', attribute name: 'fullName')"
        );

        await expect(User.fork().get({name: 'User 1'})).rejects.toThrow(
          "The property 'name' is missing (storable name: 'user')"
        );

        const ForkedUser = User.fork();

        user = new ForkedUser({id: 'user1', email: '1@user.com', reference: 1});

        await expect(ForkedUser.get({id: 'user1'})).rejects.toThrow(
          "Cannot load a storable that is new (storable name: 'user')"
        );
      });

      test('has()', async () => {
        const User = userClassProvider();

        if (!(User.hasStore() || User.getRemoteComponent() !== undefined)) {
          return await expect(User.fork().has('user1')).rejects.toThrow(
            "To be able to execute the load() method (called from has()), a storable should be registered in a store or have an exposed load() remote method (storable name: 'user')"
          );
        }

        expect(await User.fork().has('user1')).toBe(true);
        expect(await User.fork().has('user2')).toBe(false);

        expect(await User.fork().has({id: 'user1'})).toBe(true);
        expect(await User.fork().has({id: 'user2'})).toBe(false);

        expect(await User.fork().has({email: '1@user.com'})).toBe(true);
        expect(await User.fork().has({email: '2@user.com'})).toBe(false);

        expect(await User.fork().has({reference: 1})).toBe(true);
        expect(await User.fork().has({reference: 2})).toBe(false);
      });

      test('load()', async () => {
        const User = userClassProvider();

        let user = User.fork().prototype.deserialize({id: 'user1'});

        if (!(User.hasStore() || User.getRemoteComponent() !== undefined)) {
          return await expect(user.load()).rejects.toThrow(
            "To be able to execute the load() method, a storable should be registered in a store or have an exposed load() remote method (storable name: 'user')"
          );
        }

        expect(await user.load({})).toBe(user);
        expect(user.serialize()).toStrictEqual({__component: 'user', id: 'user1'});

        expect(await user.load({email: true})).toBe(user);
        expect(user.serialize()).toStrictEqual({
          __component: 'user',
          id: 'user1',
          email: '1@user.com'
        });

        expect(await user.load()).toBe(user);
        expect(user.serialize()).toStrictEqual({
          __component: 'user',
          id: 'user1',
          email: '1@user.com',
          reference: 1,
          fullName: 'User 1',
          accessLevel: 0,
          emailIsVerified: false,
          createdOn: {__date: CREATED_ON.toISOString()},
          updatedOn: {__undefined: true}
        });

        user = User.fork().prototype.deserialize({id: 'user2'});

        await expect(user.load({})).rejects.toThrow(
          "Cannot load a document that is missing from the store (collection: 'User', id: 'user2'"
        );
        expect(await user.load({}, {throwIfMissing: false})).toBeUndefined();

        user = User.fork().prototype.deserialize({email: '1@user.com'});

        expect(await user.load({})).toBe(user);
        expect(user.serialize()).toStrictEqual({
          __component: 'user',
          id: 'user1',
          email: '1@user.com'
        });

        expect(await user.load({fullName: true})).toBe(user);
        expect(user.serialize()).toStrictEqual({
          __component: 'user',
          id: 'user1',
          email: '1@user.com',
          fullName: 'User 1'
        });

        user = User.fork().prototype.deserialize({fullName: 'User 1'});

        await expect(user.load({})).rejects.toThrow(
          "Cannot get an identifier descriptor from a storable that has no set identifier (storable name: 'user')"
        );

        user = new (User.fork())({id: 'user1', email: '1@user.com', reference: 1});

        await expect(user.load({})).rejects.toThrow(
          "Cannot load a storable that is new (storable name: 'user')"
        );
      });

      test('save()', async () => {
        const User = userClassProvider();

        let user = new (User.fork())({
          id: 'user2',
          email: '2@user.com',
          reference: 2,
          fullName: 'User 2'
        });

        if (!(User.hasStore() || User.getRemoteComponent() !== undefined)) {
          return await expect(user.save()).rejects.toThrow(
            "To be able to execute the save() method, a storable should be registered in a store or have an exposed save() remote method (storable name: 'user')"
          );
        }

        expect(await user.save()).toBe(user);

        user = await User.fork().get('user2');

        expect(user.serialize()).toStrictEqual({
          __component: 'user',
          id: 'user2',
          email: '2@user.com',
          reference: 2,
          fullName: 'User 2',
          accessLevel: 0,
          emailIsVerified: false,
          createdOn: {__date: CREATED_ON.toISOString()},
          updatedOn: {__undefined: true}
        });

        user.fullName = 'User 2 (modified)';
        user.updatedOn = UPDATED_ON;

        expect(await user.save()).toBe(user);

        user = await User.fork().get('user2');

        expect(user.serialize()).toStrictEqual({
          __component: 'user',
          id: 'user2',
          email: '2@user.com',
          reference: 2,
          fullName: 'User 2 (modified)',
          accessLevel: 0,
          emailIsVerified: false,
          createdOn: {__date: CREATED_ON.toISOString()},
          updatedOn: {__date: UPDATED_ON.toISOString()}
        });

        user.updatedOn = undefined;

        expect(await user.save()).toBe(user);

        user = await User.fork().get('user2');

        expect(user.serialize()).toStrictEqual({
          __component: 'user',
          id: 'user2',
          email: '2@user.com',
          reference: 2,
          fullName: 'User 2 (modified)',
          accessLevel: 0,
          emailIsVerified: false,
          createdOn: {__date: CREATED_ON.toISOString()},
          updatedOn: {__undefined: true}
        });

        user = User.fork().prototype.deserialize({id: 'user3', fullName: 'User 3'});

        expect(await user.save(true, {throwIfMissing: false})).toBe(undefined);
        await expect(user.save()).rejects.toThrow(
          "Cannot save a non-new document that is missing from the store (collection: 'User', id: 'user3')"
        );

        user = new (User.fork())({
          id: 'user1',
          email: '1@user.com',
          reference: 1,
          fullName: 'User 1 (modified)'
        });

        expect(await user.save(true, {throwIfExists: false})).toBe(undefined);
        await expect(user.save()).rejects.toThrow(
          "Cannot save a new document that already exists in the store (collection: 'User', id: 'user1')"
        );

        user = User.fork().prototype.deserialize({id: 'user3', fullName: 'User 3'});

        await expect(user.save(true, {throwIfMissing: true, throwIfExists: true})).rejects.toThrow(
          "The 'throwIfMissing' and 'throwIfExists' options cannot be both set to true"
        );
      });

      test('delete()', async () => {
        const User = userClassProvider();

        let user = User.fork().prototype.deserialize({id: 'user1'});

        if (!(User.hasStore() || User.getRemoteComponent() !== undefined)) {
          return await expect(user.delete()).rejects.toThrow(
            "To be able to execute the delete() method, a storable should be registered in a store or have an exposed delete() remote method (storable name: 'user')"
          );
        }

        expect(await user.delete()).toBe(user);

        await expect(user.delete()).rejects.toThrow(
          "Cannot delete a document that is missing from the store (collection: 'User', id: 'user1'"
        );

        expect(await user.delete({throwIfMissing: false})).toBeUndefined();

        user = new (User.fork())({id: 'user1', email: '1@user.com', reference: 1});

        await expect(user.delete()).rejects.toThrow(
          "Cannot delete a storable that is new (storable name: 'user')"
        );
      });

      test('find()', async () => {
        const User = userClassProvider();

        if (!(User.hasStore() || User.getRemoteComponent() !== undefined)) {
          return await expect(User.fork().find()).rejects.toThrow(
            "To be able to execute the find() method, a storable should be registered in a store or have an exposed find() remote method (storable name: 'User')"
          );
        }

        let users = await User.fork().find();

        expect(serialize(users)).toStrictEqual([
          {
            __component: 'user',
            id: 'user1',
            email: '1@user.com',
            reference: 1,
            fullName: 'User 1',
            accessLevel: 0,
            emailIsVerified: false,
            createdOn: {__date: CREATED_ON.toISOString()},
            updatedOn: {__undefined: true}
          },
          {
            __component: 'user',
            id: 'user11',
            email: '11@user.com',
            reference: 11,
            fullName: 'User 11',
            accessLevel: 3,
            emailIsVerified: true,
            createdOn: {__date: CREATED_ON.toISOString()},
            updatedOn: {__undefined: true}
          },
          {
            __component: 'user',
            id: 'user12',
            email: '12@user.com',
            reference: 12,
            fullName: 'User 12',
            accessLevel: 1,
            emailIsVerified: true,
            createdOn: {__date: CREATED_ON.toISOString()},
            updatedOn: {__undefined: true}
          },
          {
            __component: 'user',
            id: 'user13',
            email: '13@user.com',
            reference: 13,
            fullName: 'User 13',
            accessLevel: 3,
            emailIsVerified: false,
            createdOn: {__date: CREATED_ON.toISOString()},
            updatedOn: {__undefined: true}
          }
        ]);

        users = await User.fork().find({fullName: 'User 12'});

        expect(serialize(users)).toStrictEqual([
          {
            __component: 'user',
            id: 'user12',
            email: '12@user.com',
            reference: 12,
            fullName: 'User 12',
            accessLevel: 1,
            emailIsVerified: true,
            createdOn: {__date: CREATED_ON.toISOString()},
            updatedOn: {__undefined: true}
          }
        ]);

        users = await User.fork().find({accessLevel: 3});

        expect(serialize(users)).toStrictEqual([
          {
            __component: 'user',
            id: 'user11',
            email: '11@user.com',
            reference: 11,
            fullName: 'User 11',
            accessLevel: 3,
            emailIsVerified: true,
            createdOn: {__date: CREATED_ON.toISOString()},
            updatedOn: {__undefined: true}
          },
          {
            __component: 'user',
            id: 'user13',
            email: '13@user.com',
            reference: 13,
            fullName: 'User 13',
            accessLevel: 3,
            emailIsVerified: false,
            createdOn: {__date: CREATED_ON.toISOString()},
            updatedOn: {__undefined: true}
          }
        ]);

        users = await User.fork().find({emailIsVerified: false}, {email: true});

        expect(serialize(users)).toStrictEqual([
          {__component: 'user', id: 'user1', email: '1@user.com'},
          {__component: 'user', id: 'user13', email: '13@user.com'}
        ]);

        users = await User.fork().find({accessLevel: 3, emailIsVerified: true}, {});

        expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user11'}]);

        users = await User.fork().find({}, {accessLevel: true}, {sort: {accessLevel: 1}});

        expect(serialize(users)).toStrictEqual([
          {__component: 'user', id: 'user1', accessLevel: 0},
          {__component: 'user', id: 'user12', accessLevel: 1},
          {__component: 'user', id: 'user11', accessLevel: 3},
          {__component: 'user', id: 'user13', accessLevel: 3}
        ]);

        users = await User.fork().find({}, {accessLevel: true}, {sort: {accessLevel: -1}});

        expect(serialize(users)).toStrictEqual([
          {__component: 'user', id: 'user11', accessLevel: 3},
          {__component: 'user', id: 'user13', accessLevel: 3},
          {__component: 'user', id: 'user12', accessLevel: 1},
          {__component: 'user', id: 'user1', accessLevel: 0}
        ]);

        users = await User.fork().find(
          {},
          {reference: true, accessLevel: true},
          {sort: {accessLevel: 1, reference: -1}}
        );

        expect(serialize(users)).toStrictEqual([
          {__component: 'user', id: 'user1', reference: 1, accessLevel: 0},
          {__component: 'user', id: 'user12', reference: 12, accessLevel: 1},
          {__component: 'user', id: 'user13', reference: 13, accessLevel: 3},
          {__component: 'user', id: 'user11', reference: 11, accessLevel: 3}
        ]);

        users = await User.fork().find({}, {}, {skip: 2});

        expect(serialize(users)).toStrictEqual([
          {__component: 'user', id: 'user12'},
          {__component: 'user', id: 'user13'}
        ]);

        users = await User.fork().find({}, {}, {limit: 2});

        expect(serialize(users)).toStrictEqual([
          {__component: 'user', id: 'user1'},
          {__component: 'user', id: 'user11'}
        ]);

        users = await User.fork().find({}, {}, {skip: 1, limit: 2});

        expect(serialize(users)).toStrictEqual([
          {__component: 'user', id: 'user11'},
          {__component: 'user', id: 'user12'}
        ]);

        users = await User.fork().find({}, {}, {sort: {id: -1}, skip: 1, limit: 2});

        expect(serialize(users)).toStrictEqual([
          {__component: 'user', id: 'user12'},
          {__component: 'user', id: 'user11'}
        ]);
      });

      test('count()', async () => {
        const User = userClassProvider();

        if (!(User.hasStore() || User.getRemoteComponent() !== undefined)) {
          return await expect(User.fork().count()).rejects.toThrow(
            "To be able to execute the count() method, a storable should be registered in a store or have an exposed count() remote method (storable name: 'User')"
          );
        }

        expect(await User.fork().count()).toBe(4);

        expect(await User.fork().count({fullName: 'User 12'})).toBe(1);

        expect(await User.fork().count({accessLevel: 3})).toBe(2);

        expect(await User.fork().count({emailIsVerified: false})).toBe(2);

        expect(await User.fork().count({accessLevel: 3, emailIsVerified: true})).toBe(1);
      });
    });
  }
});

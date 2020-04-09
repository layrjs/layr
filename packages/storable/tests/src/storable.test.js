import {Model} from '@liaison/model';
import {MongoDBStore} from '@liaison/mongodb-store';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {ComponentClient} from '@liaison/component-client';
import {ComponentServer} from '@liaison/component-server';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60 * 1000; // 1 minute

import {
  Storable,
  isStorableClass,
  isStorableInstance,
  primaryIdentifier,
  secondaryIdentifier,
  attribute,
  loader,
  finder,
  expose,
  inherit,
  serialize
} from '../../..';
import {MockStore} from './mock-store';
import {getInitialCollections, seedMongoDB, CREATED_ON, UPDATED_ON} from './fixtures';

describe('Storable', () => {
  class BaseUser extends Storable {
    @primaryIdentifier() id;
    @secondaryIdentifier() email;
    @secondaryIdentifier('number') reference;
    @attribute('string') fullName = '';
    @attribute('number') accessLevel = 0;
    @attribute('[string]') tags = [];
    @attribute('object?') location;
    @attribute('[object]') pastLocations = [];
    @attribute('picture?') picture;
    @attribute('[picture]') pastPictures = [];
    @attribute('boolean') emailIsVerified = false;
    @attribute('date') createdOn = new Date('2020-03-22T01:27:42.612Z');
    @attribute('date?') updatedOn;
  }

  class BasePicture extends Model {
    @attribute('string?') type;
    @attribute('string') url;
  }

  describe('General methods', () => {
    test('isStorableClass()', async () => {
      class User extends BaseUser {}

      class Picture extends BasePicture {}

      User.registerRelatedComponent(Picture);

      expect(isStorableClass(User)).toBe(true);
      expect(isStorableClass(User.prototype)).toBe(false);
      expect(isStorableClass(Picture)).toBe(false);

      const user = new User({id: 'user1', email: '1@user.com', reference: 1});

      expect(isStorableClass(user)).toBe(false);
    });

    test('isStorableInstance()', async () => {
      class User extends BaseUser {}

      class Picture extends BasePicture {}

      User.registerRelatedComponent(Picture);

      expect(isStorableInstance(User.prototype)).toBe(true);
      expect(isStorableInstance(User)).toBe(false);
      expect(isStorableInstance(Picture.prototype)).toBe(false);

      const user = new User({
        id: 'user1',
        email: '1@user.com',
        reference: 1,
        picture: new Picture({type: 'JPEG', url: 'https://pictures.com/1-1.jpg'})
      });

      expect(isStorableInstance(user)).toBe(true);
      expect(isStorableInstance(user.picture)).toBe(false);
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
  });

  describe('Storage operations', () => {
    describe('With a local mock store', () => {
      testOperations(function() {
        class User extends BaseUser {}

        class Picture extends BasePicture {}

        User.registerRelatedComponent(Picture);

        MockStore.create([User], {initialCollections: getInitialCollections()});

        return User;
      });
    });

    describe('With a local MongoDB store', () => {
      let User;
      let server;
      let store;

      beforeEach(async () => {
        User = class User extends BaseUser {};

        class Picture extends BasePicture {}

        User.registerRelatedComponent(Picture);

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
        // eslint-disable-next-line max-nested-callbacks
        const server = (() => {
          class User extends BaseUser {
            @expose({get: true, set: true}) @inherit() id;
            @expose({get: true, set: true}) @inherit() email;
            @expose({get: true, set: true}) @inherit() reference;
            @expose({get: true, set: true}) @inherit() fullName;
            @expose({get: true, set: true}) @inherit() accessLevel;
            @expose({get: true, set: true}) @inherit() tags;
            @expose({get: true, set: true}) @inherit() location;
            @expose({get: true, set: true}) @inherit() pastLocations;
            @expose({get: true, set: true}) @inherit() picture;
            @expose({get: true, set: true}) @inherit() pastPictures;
            @expose({get: true, set: true}) @inherit() emailIsVerified;
            @expose({get: true, set: true}) @inherit() createdOn;
            @expose({get: true, set: true}) @inherit() updatedOn;

            @expose({call: true}) @inherit() load;
            @expose({call: true}) @inherit() save;
            @expose({call: true}) @inherit() delete;
            @expose({call: true}) @inherit() static find;
            @expose({call: true}) @inherit() static count;
          }

          class Picture extends BasePicture {
            @expose({get: true, set: true}) @inherit() type;
            @expose({get: true, set: true}) @inherit() url;
          }

          User.registerRelatedComponent(Picture);

          MockStore.create([User], {initialCollections: getInitialCollections()});

          return new ComponentServer([User, Picture]);
        })();

        const client = new ComponentClient(server, {baseComponents: [Model, Storable]});
        const [User] = client.getComponents();

        return User;
      });
    });

    describe('Without a store', () => {
      testOperations(function() {
        class User extends BaseUser {}

        class Picture extends BasePicture {}

        User.registerRelatedComponent(Picture);

        return User;
      });
    });

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

          const expectedSerializedUser = {
            __component: 'user',
            id: 'user1',
            email: '1@user.com',
            reference: 1,
            fullName: 'User 1',
            accessLevel: 0,
            tags: ['spammer', 'blocked'],
            location: {country: 'USA', city: 'Paris'},
            pastLocations: [
              {country: 'USA', city: 'Nice'},
              {country: 'USA', city: 'New York'}
            ],
            picture: {__component: 'picture', type: 'JPEG', url: 'https://pictures.com/1-2.jpg'},
            pastPictures: [
              {__component: 'picture', type: 'JPEG', url: 'https://pictures.com/1-1.jpg'},
              {__component: 'picture', type: 'PNG', url: 'https://pictures.com/1-1.png'}
            ],
            emailIsVerified: false,
            createdOn: {__date: CREATED_ON.toISOString()},
            updatedOn: {__undefined: true}
          };

          expect(user.serialize()).toStrictEqual(expectedSerializedUser);

          user = await User.fork().get({id: 'user1'});

          expect(user.serialize()).toStrictEqual(expectedSerializedUser);

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

          expect(
            await User.fork().get({id: 'user2'}, true, {throwIfMissing: false})
          ).toBeUndefined();

          user = await User.fork().get({email: '1@user.com'});

          expect(user.serialize()).toStrictEqual(expectedSerializedUser);

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
            tags: ['spammer', 'blocked'],
            location: {country: 'USA', city: 'Paris'},
            pastLocations: [
              {country: 'USA', city: 'Nice'},
              {country: 'USA', city: 'New York'}
            ],
            picture: {__component: 'picture', type: 'JPEG', url: 'https://pictures.com/1-2.jpg'},
            pastPictures: [
              {__component: 'picture', type: 'JPEG', url: 'https://pictures.com/1-1.jpg'},
              {__component: 'picture', type: 'PNG', url: 'https://pictures.com/1-1.png'}
            ],
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
          const Picture = User.getRelatedComponent('Picture');

          let user = new (User.fork())({
            id: 'user2',
            email: '2@user.com',
            reference: 2,
            fullName: 'User 2',
            tags: ['newcomer'],
            location: {country: 'USA', city: 'New York'},
            picture: new Picture({type: 'JPEG', url: 'https://pictures.com/2-1.jpg'})
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
            tags: ['newcomer'],
            location: {country: 'USA', city: 'New York'},
            pastLocations: [],
            picture: {__component: 'picture', type: 'JPEG', url: 'https://pictures.com/2-1.jpg'},
            pastPictures: [],
            emailIsVerified: false,
            createdOn: {__date: CREATED_ON.toISOString()},
            updatedOn: {__undefined: true}
          });

          user.fullName = 'User 2 (modified)';
          user.accessLevel = 1;
          user.tags = [];
          user.location.state = 'New York';
          user.pastLocations.push({country: 'USA', city: 'San Francisco'});
          user.picture.url = 'https://pictures.com/2-2.jpg';
          user.pastPictures.push(new Picture({type: 'JPEG', url: 'https://pictures.com/2-1.jpg'}));
          user.updatedOn = UPDATED_ON;

          expect(await user.save()).toBe(user);

          user = await User.fork().get('user2', {
            fullName: true,
            accessLevel: true,
            tags: true,
            location: true,
            pastLocations: true,
            picture: true,
            pastPictures: true,
            updatedOn: true
          });

          expect(user.serialize()).toStrictEqual({
            __component: 'user',
            id: 'user2',
            fullName: 'User 2 (modified)',
            accessLevel: 1,
            tags: [],
            location: {country: 'USA', state: 'New York', city: 'New York'},
            pastLocations: [{country: 'USA', city: 'San Francisco'}],
            picture: {__component: 'picture', type: 'JPEG', url: 'https://pictures.com/2-2.jpg'},
            pastPictures: [
              {__component: 'picture', type: 'JPEG', url: 'https://pictures.com/2-1.jpg'}
            ],
            updatedOn: {__date: UPDATED_ON.toISOString()}
          });

          user.location = {country: 'USA'};
          delete user.location.state;
          delete user.location.city;
          delete user.pastLocations[0].city;
          user.picture.type = undefined;
          user.pastPictures[0].type = undefined;
          user.updatedOn = undefined;

          expect(await user.save()).toBe(user);

          user = await User.fork().get('user2', {
            location: true,
            pastLocations: true,
            picture: true,
            pastPictures: true,
            updatedOn: true
          });

          expect(user.serialize()).toStrictEqual({
            __component: 'user',
            id: 'user2',
            location: {country: 'USA'},
            pastLocations: [{country: 'USA'}],
            picture: {
              __component: 'picture',
              type: {__undefined: true},
              url: 'https://pictures.com/2-2.jpg'
            },
            pastPictures: [
              {
                __component: 'picture',
                type: {__undefined: true},
                url: 'https://pictures.com/2-1.jpg'
              }
            ],
            updatedOn: {__undefined: true}
          });

          // Undefined values in object attributes should not be saved
          user.location.country = undefined;
          user.pastLocations[0].country = undefined;

          expect(await user.save()).toBe(user);

          user = await User.fork().get('user2', {location: true, pastLocations: true});

          expect(user.serialize()).toStrictEqual({
            __component: 'user',
            id: 'user2',
            location: {},
            pastLocations: [{}]
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

          await expect(
            user.save(true, {throwIfMissing: true, throwIfExists: true})
          ).rejects.toThrow(
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

          // === Simple queries ===

          // --- Without a query ---

          let users = await User.fork().find();

          expect(serialize(users)).toStrictEqual([
            {
              __component: 'user',
              id: 'user1',
              email: '1@user.com',
              reference: 1,
              fullName: 'User 1',
              accessLevel: 0,
              tags: ['spammer', 'blocked'],
              location: {country: 'USA', city: 'Paris'},
              pastLocations: [
                {country: 'USA', city: 'Nice'},
                {country: 'USA', city: 'New York'}
              ],
              picture: {__component: 'picture', type: 'JPEG', url: 'https://pictures.com/1-2.jpg'},
              pastPictures: [
                {__component: 'picture', type: 'JPEG', url: 'https://pictures.com/1-1.jpg'},
                {__component: 'picture', type: 'PNG', url: 'https://pictures.com/1-1.png'}
              ],
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
              tags: ['owner', 'admin'],
              location: {country: 'USA'},
              pastLocations: [{country: 'France'}],
              picture: {__component: 'picture', type: 'JPEG', url: 'https://pictures.com/11-1.jpg'},
              pastPictures: [
                {__component: 'picture', type: 'PNG', url: 'https://pictures.com/11-1.png'}
              ],
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
              tags: [],
              location: {country: 'France', city: 'Paris'},
              pastLocations: [
                {country: 'France', city: 'Nice'},
                {country: 'Japan', city: 'Tokyo'}
              ],
              picture: {__component: 'picture', type: 'PNG', url: 'https://pictures.com/12-3.png'},
              pastPictures: [
                {__component: 'picture', type: 'PNG', url: 'https://pictures.com/12-2.png'},
                {__component: 'picture', type: 'PNG', url: 'https://pictures.com/12-1.png'}
              ],
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
              tags: ['admin'],
              location: {__undefined: true},
              pastLocations: [],
              picture: {__undefined: true},
              pastPictures: [],
              emailIsVerified: false,
              createdOn: {__date: CREATED_ON.toISOString()},
              updatedOn: {__undefined: true}
            }
          ]);

          // --- With a simple query ---

          users = await User.fork().find({fullName: 'User 12'});

          expect(serialize(users)).toStrictEqual([
            {
              __component: 'user',
              id: 'user12',
              email: '12@user.com',
              reference: 12,
              fullName: 'User 12',
              accessLevel: 1,
              tags: [],
              location: {country: 'France', city: 'Paris'},
              pastLocations: [
                {country: 'France', city: 'Nice'},
                {country: 'Japan', city: 'Tokyo'}
              ],
              picture: {__component: 'picture', type: 'PNG', url: 'https://pictures.com/12-3.png'},
              pastPictures: [
                {__component: 'picture', type: 'PNG', url: 'https://pictures.com/12-2.png'},
                {__component: 'picture', type: 'PNG', url: 'https://pictures.com/12-1.png'}
              ],
              emailIsVerified: true,
              createdOn: {__date: CREATED_ON.toISOString()},
              updatedOn: {__undefined: true}
            }
          ]);

          // --- With an attribute selector ---

          users = await User.fork().find({accessLevel: 3}, {email: true});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user11', email: '11@user.com'},
            {__component: 'user', id: 'user13', email: '13@user.com'}
          ]);

          users = await User.fork().find({emailIsVerified: false}, {email: true});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user1', email: '1@user.com'},
            {__component: 'user', id: 'user13', email: '13@user.com'}
          ]);

          // --- With a query involving two attributes ---

          users = await User.fork().find({accessLevel: 3, emailIsVerified: true}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user11'}]);

          // --- With 'sort' ---

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

          // --- With 'skip' ---

          users = await User.fork().find({}, {}, {skip: 2});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user12'},
            {__component: 'user', id: 'user13'}
          ]);

          // --- With 'limit' ---

          users = await User.fork().find({}, {}, {limit: 2});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user1'},
            {__component: 'user', id: 'user11'}
          ]);

          // --- With 'skip' and 'limit' ---

          users = await User.fork().find({}, {}, {skip: 1, limit: 2});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user11'},
            {__component: 'user', id: 'user12'}
          ]);

          // --- With 'sort', 'skip', and 'limit' ---

          users = await User.fork().find({}, {}, {sort: {id: -1}, skip: 1, limit: 2});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user12'},
            {__component: 'user', id: 'user11'}
          ]);

          await expect(User.fork().find({unknownAttribute: 1})).rejects.toThrow(
            "The property 'unknownAttribute' is missing (storable name: 'user')"
          );

          // === Advanced queries ===

          // --- With a basic operator ---

          // - '$equal' -

          users = await User.fork().find({accessLevel: {$equal: 0}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user1'}]);

          // '$equals' should be an alias of '$equal'
          users = await User.fork().find({accessLevel: {$equals: 0}}, {});

          await expect(User.fork().find({accessLevel: {$equals: /0/}}, {})).rejects.toThrow(
            "Expected a scalar value of the operator '$equal', but received a value of type 'regExp' (query: '{\"accessLevel\":{\"$equals\":{}}}')"
          );

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user1'}]);

          // - '$notEqual' -

          users = await User.fork().find({accessLevel: {$notEqual: 3}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user1'},
            {__component: 'user', id: 'user12'}
          ]);

          // - '$greaterThan' -

          users = await User.fork().find({accessLevel: {$greaterThan: 3}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({accessLevel: {$greaterThan: 2}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user11'},
            {__component: 'user', id: 'user13'}
          ]);

          // - '$greaterThanOrEqual' -

          users = await User.fork().find({accessLevel: {$greaterThanOrEqual: 3}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user11'},
            {__component: 'user', id: 'user13'}
          ]);

          // - '$lessThan' -

          users = await User.fork().find({accessLevel: {$lessThan: 1}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user1'}]);

          // - '$lessThanOrEqual' -

          users = await User.fork().find({accessLevel: {$lessThanOrEqual: 1}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user1'},
            {__component: 'user', id: 'user12'}
          ]);

          // - '$any' -

          users = await User.fork().find({accessLevel: {$any: []}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({accessLevel: {$any: [2, 4, 5]}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({accessLevel: {$any: [0, 1]}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user1'},
            {__component: 'user', id: 'user12'}
          ]);

          // --- With two basic operators ---

          users = await User.fork().find({accessLevel: {$greaterThan: 1, $lessThan: 3}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({accessLevel: {$greaterThanOrEqual: 0, $lessThan: 2}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user1'},
            {__component: 'user', id: 'user12'}
          ]);

          // --- With an impossible expression ---

          users = await User.fork().find({accessLevel: {$greaterThan: 1, $equal: 1}}, {});

          expect(serialize(users)).toStrictEqual([]);

          // --- With a string operator ---

          // - '$includes' -

          users = await User.fork().find({email: {$includes: '.org'}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({email: {$includes: '2'}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user12'}]);

          await expect(User.fork().find({email: {$includes: 2}}, {})).rejects.toThrow(
            "Expected a string as value of the operator '$includes', but received a value of type 'number' (query: '{\"email\":{\"$includes\":2}}')"
          );

          // - '$startsWith' -

          users = await User.fork().find({email: {$startsWith: '2'}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({email: {$startsWith: '1@'}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user1'}]);

          // - '$endsWith' -

          users = await User.fork().find({location: {city: {$endsWith: 'town'}}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({location: {city: {$endsWith: 'ris'}}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user1'},
            {__component: 'user', id: 'user12'}
          ]);

          // - '$matches' -

          users = await User.fork().find({location: {country: {$matches: /usa/}}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({location: {country: {$matches: /usa/i}}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user1'},
            {__component: 'user', id: 'user11'}
          ]);

          await expect(User.fork().find({location: {country: {$matches: 'usa'}}})).rejects.toThrow(
            'Expected a regular expression as value of the operator \'$matches\', but received a value of type \'string\' (query: \'{"country":{"$matches":"usa"}}\')'
          );

          // --- With a logical operator ---

          // - '$not' -

          users = await User.fork().find({createdOn: {$not: CREATED_ON}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({accessLevel: {$not: {$lessThan: 3}}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user11'},
            {__component: 'user', id: 'user13'}
          ]);

          // - '$and' -

          users = await User.fork().find({$and: [{tags: 'owner'}, {emailIsVerified: false}]}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({$and: [{tags: 'admin'}, {emailIsVerified: true}]}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user11'}]);

          // - '$or' -

          users = await User.fork().find(
            {$or: [{accessLevel: {$lessThan: 0}}, {accessLevel: {$greaterThan: 3}}]},
            {}
          );

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({$or: [{accessLevel: 0}, {accessLevel: 1}]}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user1'},
            {__component: 'user', id: 'user12'}
          ]);

          // - '$nor' -

          users = await User.fork().find(
            {$nor: [{emailIsVerified: false}, {emailIsVerified: true}]},
            {}
          );

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({$nor: [{accessLevel: 0}, {accessLevel: 1}]}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user11'},
            {__component: 'user', id: 'user13'}
          ]);

          // --- With an object attribute ---

          users = await User.fork().find({location: {country: 'Japan'}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({location: {country: 'France'}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user12'}]);

          users = await User.fork().find({location: {country: 'USA'}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user1'},
            {__component: 'user', id: 'user11'}
          ]);

          users = await User.fork().find({location: {country: 'USA', city: 'Paris'}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user1'}]);

          users = await User.fork().find({location: undefined}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user13'}]);

          // --- With an array attribute ---

          // - '$some' -

          users = await User.fork().find({tags: {$some: 'angel'}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({tags: {$some: 'blocked'}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user1'}]);

          users = await User.fork().find({tags: {$some: 'admin'}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user11'},
            {__component: 'user', id: 'user13'}
          ]);

          // '$some' should be implicit
          users = await User.fork().find({tags: 'admin'}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user11'},
            {__component: 'user', id: 'user13'}
          ]);

          // '$includes' should be replaced by '$some' when '$some' is missing
          users = await User.fork().find({tags: {$includes: 'admin'}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user11'},
            {__component: 'user', id: 'user13'}
          ]);

          // When '$some' is present, '$includes' remains a string operator
          users = await User.fork().find({tags: {$some: {$includes: 'lock'}}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user1'}]);

          // - '$every' -

          users = await User.fork().find({tags: {$every: 'admin'}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user12'},
            {__component: 'user', id: 'user13'}
          ]);

          // - '$length' -

          users = await User.fork().find({tags: {$length: 3}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({tags: {$length: 0}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user12'}]);

          users = await User.fork().find({tags: {$length: 2}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user1'},
            {__component: 'user', id: 'user11'}
          ]);

          // --- With an array of object attribute ---

          users = await User.fork().find({pastLocations: {country: 'Canada'}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({pastLocations: {country: 'Japan'}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user12'}]);

          users = await User.fork().find({pastLocations: {country: 'France'}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'user', id: 'user11'},
            {__component: 'user', id: 'user12'}
          ]);

          users = await User.fork().find({pastLocations: {country: 'USA', city: 'Nice'}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user1'}]);

          users = await User.fork().find({pastLocations: {city: undefined}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user11'}]);

          // --- With a component specified as query ---

          const ForkedUser = User.fork();

          const user = ForkedUser.prototype.deserialize({id: 'user1'});

          users = await ForkedUser.find(user, {email: true});

          expect(users).toHaveLength(1);
          expect(users[0]).toBe(user);
          expect(serialize(user)).toStrictEqual({
            __component: 'user',
            id: 'user1',
            email: '1@user.com'
          });
        });

        test('count()', async () => {
          const User = userClassProvider();

          if (!(User.hasStore() || User.getRemoteComponent() !== undefined)) {
            return await expect(User.fork().count()).rejects.toThrow(
              "To be able to execute the count() method, a storable should be registered in a store or have an exposed count() remote method (storable name: 'User')"
            );
          }

          // === Simple queries ===

          expect(await User.fork().count()).toBe(4);

          expect(await User.fork().count({fullName: 'User 12'})).toBe(1);

          expect(await User.fork().count({accessLevel: 3})).toBe(2);

          expect(await User.fork().count({emailIsVerified: false})).toBe(2);

          expect(await User.fork().count({accessLevel: 3, emailIsVerified: true})).toBe(1);

          // === Advanced queries ===

          // --- With an array attribute ---

          expect(await User.fork().count({tags: {$some: 'angel'}})).toBe(0);

          expect(await User.fork().count({tags: {$some: 'blocked'}})).toBe(1);

          expect(await User.fork().count({tags: {$some: 'admin'}})).toBe(2);

          // --- With a component specified as query ---

          expect(await User.fork().count({tags: 'admin'})).toBe(2);

          const ForkedUser = User.fork();

          const user = ForkedUser.prototype.deserialize({fullName: 'User 1'});

          expect(await ForkedUser.count(user)).toBe(1);
        });
      });
    }
  });

  describe('Loaders', () => {
    test('getStorableAttributesWithLoader()', async () => {
      const User = getUserClass();

      const attributes = Array.from(User.prototype.getStorableAttributesWithLoader());

      expect(attributes).toHaveLength(1);
      expect(attributes[0].getName()).toBe('firstName');
    });

    test('getStorableComputedAttributes()', async () => {
      const User = getUserClass();

      const attributes = Array.from(User.prototype.getStorableComputedAttributes());

      expect(attributes).toHaveLength(1);
      expect(attributes[0].getName()).toBe('firstName');
    });

    test('load()', async () => {
      const User = getUserClass();

      let user = User.fork().prototype.deserialize({id: 'user1'});
      await user.load({});

      expect(user.getAttribute('firstName').isSet()).toBe(false);

      user = User.fork().prototype.deserialize({id: 'user1'});
      await user.load({firstName: true});

      expect(user.firstName).toBe('User');

      user = User.fork().prototype.deserialize({id: 'user1'});
      await user.load({fullName: true, firstName: true});

      expect(user.serialize()).toStrictEqual({
        __component: 'user',
        id: 'user1',
        fullName: 'User 1',
        firstName: 'User'
      });
    });

    function getUserClass() {
      class User extends BaseUser {
        @loader(async function() {
          await this.load({fullName: true});

          const firstName = this.fullName.split(' ')[0];

          return firstName;
        })
        @attribute('string')
        firstName;
      }

      class Picture extends BasePicture {}

      User.registerRelatedComponent(Picture);

      MockStore.create([User], {initialCollections: getInitialCollections()});

      return User;
    }
  });

  describe('Finders', () => {
    test('getStorablePropertiesWithFinder()', async () => {
      const User = getUserClass();

      const properties = Array.from(User.prototype.getStorablePropertiesWithFinder());

      expect(properties).toHaveLength(2);
      expect(properties[0].getName()).toBe('hasNoAccess');
      expect(properties[1].getName()).toBe('hasAccessLevel');
    });

    test('getStorableComputedAttributes()', async () => {
      const User = getUserClass();

      const attributes = Array.from(User.prototype.getStorableComputedAttributes());

      expect(attributes).toHaveLength(1);
      expect(attributes[0].getName()).toBe('hasNoAccess');
    });

    test('find()', async () => {
      const User = getUserClass();

      let users = await User.fork().find({hasNoAccess: true}, {});

      expect(serialize(users)).toStrictEqual([{__component: 'user', id: 'user1'}]);

      users = await User.fork().find({hasNoAccess: true}, {hasNoAccess: true});

      expect(serialize(users)).toStrictEqual([
        {__component: 'user', id: 'user1', accessLevel: 0, hasNoAccess: true}
      ]);

      users = await User.fork().find({hasAccessLevel: 3}, {});

      expect(serialize(users)).toStrictEqual([
        {__component: 'user', id: 'user11'},
        {__component: 'user', id: 'user13'}
      ]);
    });

    function getUserClass() {
      class User extends BaseUser {
        @loader(async function() {
          await this.load({accessLevel: true});

          return this.accessLevel === 0;
        })
        @finder(async function() {
          return {accessLevel: 0};
        })
        @attribute('boolean?')
        hasNoAccess;

        @finder(async function(accessLevel) {
          return {accessLevel};
        })
        async hasAccessLevel(accessLevel) {
          await this.load({accessLevel: true});

          return this.accessLevel === accessLevel;
        }
      }

      class Picture extends BasePicture {}

      User.registerRelatedComponent(Picture);

      MockStore.create([User], {initialCollections: getInitialCollections()});

      return User;
    }
  });

  describe('Hooks', () => {
    test('getStorableAttributesWithHook()', async () => {
      const User = getUserClass();

      const getAttributesWithHook = (
        storable,
        name,
        {attributeSelector = true, setAttributesOnly = false} = {}
      ) =>
        Array.from(
          storable.getStorableAttributesWithHook(name, {attributeSelector, setAttributesOnly})
        ).map(attribute => attribute.getName());

      expect(getAttributesWithHook(User.prototype, 'beforeLoad')).toEqual(['email', 'fullName']);

      const user = User.fork().prototype.deserialize({id: 'user1'});

      expect(getAttributesWithHook(user, 'beforeLoad', {setAttributesOnly: true})).toEqual([]);

      await user.load();

      expect(getAttributesWithHook(user, 'beforeLoad', {setAttributesOnly: true})).toEqual([
        'email',
        'fullName'
      ]);

      expect(
        getAttributesWithHook(user, 'beforeLoad', {
          attributeSelector: {fullName: true},
          setAttributesOnly: true
        })
      ).toEqual(['fullName']);

      expect(
        getAttributesWithHook(user, 'beforeLoad', {attributeSelector: {}, setAttributesOnly: true})
      ).toEqual([]);
    });

    test('beforeLoad() and afterLoad()', async () => {
      const User = getUserClass();

      const user = User.fork().prototype.deserialize({id: 'user1'});

      expect(user.beforeLoadHasBeenCalled).toBeUndefined();
      expect(user.afterLoadHasBeenCalled).toBeUndefined();
      expect(user.getAttribute('email').beforeLoadHasBeenCalled).toBeUndefined();
      expect(user.getAttribute('email').afterLoadHasBeenCalled).toBeUndefined();
      expect(user.getAttribute('fullName').beforeLoadHasBeenCalled).toBeUndefined();
      expect(user.getAttribute('fullName').afterLoadHasBeenCalled).toBeUndefined();

      await user.load();

      expect(user.beforeLoadHasBeenCalled).toBe(true);
      expect(user.afterLoadHasBeenCalled).toBe(true);
      expect(user.getAttribute('email').beforeLoadHasBeenCalled).toBe(true);
      expect(user.getAttribute('email').afterLoadHasBeenCalled).toBe(true);
      expect(user.getAttribute('fullName').beforeLoadHasBeenCalled).toBe(true);
      expect(user.getAttribute('fullName').afterLoadHasBeenCalled).toBe(true);
    });

    test('beforeSave() and afterSave()', async () => {
      const User = getUserClass();

      const user = await User.fork().get('user1');

      user.fullName = 'User 1 (modified)';

      expect(user.beforeSaveHasBeenCalled).toBeUndefined();
      expect(user.afterSaveHasBeenCalled).toBeUndefined();
      expect(user.getAttribute('email').beforeSaveHasBeenCalled).toBeUndefined();
      expect(user.getAttribute('email').afterSaveHasBeenCalled).toBeUndefined();
      expect(user.getAttribute('fullName').beforeSaveHasBeenCalled).toBeUndefined();
      expect(user.getAttribute('fullName').afterSaveHasBeenCalled).toBeUndefined();

      await user.save();

      expect(user.beforeSaveHasBeenCalled).toBe(true);
      expect(user.afterSaveHasBeenCalled).toBe(true);
      expect(user.getAttribute('email').beforeSaveHasBeenCalled).toBe(true);
      expect(user.getAttribute('email').afterSaveHasBeenCalled).toBe(true);
      expect(user.getAttribute('fullName').beforeSaveHasBeenCalled).toBe(true);
      expect(user.getAttribute('fullName').afterSaveHasBeenCalled).toBe(true);
    });

    test('beforeDelete() and afterDelete()', async () => {
      const User = getUserClass();

      const user = await User.fork().get('user1');

      expect(user.beforeDeleteHasBeenCalled).toBeUndefined();
      expect(user.afterDeleteHasBeenCalled).toBeUndefined();
      expect(user.getAttribute('email').beforeDeleteHasBeenCalled).toBeUndefined();
      expect(user.getAttribute('email').afterDeleteHasBeenCalled).toBeUndefined();
      expect(user.getAttribute('fullName').beforeDeleteHasBeenCalled).toBeUndefined();
      expect(user.getAttribute('fullName').afterDeleteHasBeenCalled).toBeUndefined();

      await user.delete();

      expect(user.beforeDeleteHasBeenCalled).toBe(true);
      expect(user.afterDeleteHasBeenCalled).toBe(true);
      expect(user.getAttribute('email').beforeDeleteHasBeenCalled).toBe(true);
      expect(user.getAttribute('email').afterDeleteHasBeenCalled).toBe(true);
      expect(user.getAttribute('fullName').beforeDeleteHasBeenCalled).toBe(true);
      expect(user.getAttribute('fullName').afterDeleteHasBeenCalled).toBe(true);
    });

    function getUserClass() {
      class User extends BaseUser {
        @secondaryIdentifier('string', {
          beforeLoad() {
            this.getAttribute('email').beforeLoadHasBeenCalled = true;
          },
          afterLoad() {
            this.getAttribute('email').afterLoadHasBeenCalled = true;
          },
          beforeSave() {
            this.getAttribute('email').beforeSaveHasBeenCalled = true;
          },
          afterSave() {
            this.getAttribute('email').afterSaveHasBeenCalled = true;
          },
          beforeDelete() {
            this.getAttribute('email').beforeDeleteHasBeenCalled = true;
          },
          afterDelete() {
            this.getAttribute('email').afterDeleteHasBeenCalled = true;
          }
        })
        email;

        @attribute('string', {
          beforeLoad() {
            this.getAttribute('fullName').beforeLoadHasBeenCalled = true;
          },
          afterLoad() {
            this.getAttribute('fullName').afterLoadHasBeenCalled = true;
          },
          beforeSave() {
            this.getAttribute('fullName').beforeSaveHasBeenCalled = true;
          },
          afterSave() {
            this.getAttribute('fullName').afterSaveHasBeenCalled = true;
          },
          beforeDelete() {
            this.getAttribute('fullName').beforeDeleteHasBeenCalled = true;
          },
          afterDelete() {
            this.getAttribute('fullName').afterDeleteHasBeenCalled = true;
          }
        })
        fullName = '';

        async beforeLoad(attributeSelector) {
          await super.beforeLoad(attributeSelector);

          this.beforeLoadHasBeenCalled = true;
        }

        async afterLoad(attributeSelector) {
          await super.afterLoad(attributeSelector);

          this.afterLoadHasBeenCalled = true;
        }

        async beforeSave(attributeSelector) {
          await super.beforeSave(attributeSelector);

          this.beforeSaveHasBeenCalled = true;
        }

        async afterSave(attributeSelector) {
          await super.afterSave(attributeSelector);

          this.afterSaveHasBeenCalled = true;
        }

        async beforeDelete() {
          await super.beforeDelete();

          this.beforeDeleteHasBeenCalled = true;
        }

        async afterDelete() {
          await super.afterDelete();

          this.afterDeleteHasBeenCalled = true;
        }
      }

      class Picture extends BasePicture {}

      User.registerRelatedComponent(Picture);

      MockStore.create([User], {initialCollections: getInitialCollections()});

      return User;
    }
  });
});

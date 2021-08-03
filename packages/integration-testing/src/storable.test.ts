import {
  Component,
  EmbeddedComponent,
  AttributeSelector,
  provide,
  expose,
  serialize
} from '@layr/component';
import {
  Storable,
  StorableComponent,
  attribute,
  primaryIdentifier,
  secondaryIdentifier,
  method,
  loader,
  finder,
  isStorableClass,
  isStorableInstance,
  StorableAttributeHookName
} from '@layr/storable';
import type {Store} from '@layr/store';
import {MemoryStore} from '@layr/memory-store';
import {MongoDBStore} from '@layr/mongodb-store';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {ComponentClient} from '@layr/component-client';
import {ComponentServer} from '@layr/component-server';
import {PlainObject} from 'core-helpers';

import {getInitialCollections, CREATED_ON, UPDATED_ON, seedMongoDB} from './storable.fixture';

jest.setTimeout(60 * 1000); // 1 minute

describe('Storable', () => {
  class BasePicture extends EmbeddedComponent {
    @attribute('string?') type?: string;
    @attribute('string') url!: string;
  }

  class BaseOrganization extends Storable(Component) {
    @primaryIdentifier() id!: string;
    @secondaryIdentifier() slug!: string;
    @attribute('string') name!: string;
  }

  class BaseUser extends Storable(Component) {
    @provide() static Picture = BasePicture;
    @provide() static Organization = BaseOrganization;

    @primaryIdentifier() id!: string;
    @secondaryIdentifier() email!: string;
    @secondaryIdentifier('number') reference!: number;
    @attribute('string') fullName: string = '';
    @attribute('number') accessLevel: number = 0;
    @attribute('string[]') tags: string[] = [];
    @attribute('object?') location?: PlainObject;
    @attribute('object[]') pastLocations: PlainObject[] = [];
    @attribute('Picture?') picture?: BasePicture;
    @attribute('Picture[]') pastPictures: BasePicture[] = [];
    @attribute('Organization?') organization?: BaseOrganization;
    @attribute('boolean') emailIsVerified: boolean = false;
    @attribute('Date') createdOn: Date = new Date('2020-03-22T01:27:42.612Z');
    @attribute('Date?') updatedOn?: Date;
  }

  describe('General methods', () => {
    test('isStorableClass()', async () => {
      class Picture extends BasePicture {}

      class Organization extends BaseOrganization {}

      class User extends BaseUser {
        @provide() static Picture = Picture;
        @provide() static Organization = Organization;
      }

      expect(isStorableClass(User)).toBe(true);
      expect(isStorableClass(User.prototype)).toBe(false);
      expect(isStorableClass(Picture)).toBe(false);
      expect(isStorableClass(Organization)).toBe(true);

      const user = new User({id: 'user1', email: '1@user.com', reference: 1});

      expect(isStorableClass(user)).toBe(false);
    });

    test('isStorableInstance()', async () => {
      class Picture extends BasePicture {}

      class Organization extends BaseOrganization {}

      class User extends BaseUser {
        @provide() static Picture = Picture;
        @provide() static Organization = Organization;
      }

      expect(isStorableInstance(User.prototype)).toBe(true);
      expect(isStorableInstance(User)).toBe(false);
      expect(isStorableInstance(Picture.prototype)).toBe(false);
      expect(isStorableInstance(Organization.prototype)).toBe(true);

      const user = new User({
        id: 'user1',
        email: '1@user.com',
        reference: 1,
        picture: new Picture({type: 'JPEG', url: 'https://pictures.com/1-1.jpg'}),
        organization: new Organization({id: 'org1', slug: 'organization-1', name: 'Organization 1'})
      });

      expect(isStorableInstance(user)).toBe(true);
      expect(isStorableInstance(user.picture)).toBe(false);
      expect(isStorableInstance(user.organization)).toBe(true);
    });

    test('getStore() and hasStore()', async () => {
      class Picture extends BasePicture {}

      class Organization extends BaseOrganization {}

      class User extends BaseUser {
        @provide() static Picture = Picture;
        @provide() static Organization = Organization;
      }

      expect(User.hasStore()).toBe(false);
      expect(() => User.getStore()).toThrow(
        "Cannot get the store of a storable component that is not registered (component: 'User')"
      );
      expect(Organization.hasStore()).toBe(false);

      const store = new MemoryStore();

      store.registerRootComponent(User);

      expect(User.hasStore()).toBe(true);
      expect(User.getStore()).toBe(store);
      expect(Organization.hasStore()).toBe(true);
      expect(Organization.getStore()).toBe(store);
    });
  });

  describe('Storage operations', () => {
    if (true) {
      describe('With a local memory store', () => {
        testOperations(function () {
          class Picture extends BasePicture {}

          class Organization extends BaseOrganization {}

          class User extends BaseUser {
            @provide() static Picture = Picture;
            @provide() static Organization = Organization;
          }

          const store = new MemoryStore({initialCollections: getInitialCollections()});

          store.registerRootComponent(User);

          return User;
        });
      });
    }

    if (true) {
      describe('With a local MongoDB store', () => {
        let userClass: typeof BaseUser;
        let server: MongoMemoryServer;
        let store: MongoDBStore;

        beforeEach(async () => {
          class Picture extends BasePicture {}

          class Organization extends BaseOrganization {}

          class User extends BaseUser {
            @provide() static Picture = Picture;
            @provide() static Organization = Organization;
          }

          userClass = User;

          server = new MongoMemoryServer({instance: {storageEngine: 'wiredTiger'}});

          const connectionString = await server.getUri();

          await seedMongoDB(connectionString);

          store = new MongoDBStore(connectionString);

          store.registerRootComponent(User);

          await store.connect();

          await store.migrateStorables({silent: true});
        });

        afterEach(async () => {
          await store?.disconnect();

          await server?.stop();
        });

        testOperations(function () {
          return userClass;
        });
      });
    }

    if (true) {
      describe('With a remote memory store', () => {
        testOperations(() => {
          const server = (() => {
            @expose({
              prototype: {
                type: {get: true, set: true},
                url: {get: true, set: true}
              }
            })
            class Picture extends BasePicture {}

            @expose({
              get: {call: true},

              prototype: {
                id: {get: true, set: true},
                slug: {get: true},
                name: {get: true, set: true},

                load: {call: true}
              }
            })
            class Organization extends BaseOrganization {}

            @expose({
              get: {call: true},
              find: {call: true},
              count: {call: true},

              prototype: {
                id: {get: true, set: true},
                email: {get: true, set: true},
                reference: {get: true, set: true},
                fullName: {get: true, set: true},
                accessLevel: {get: true, set: true},
                tags: {get: true, set: true},
                location: {get: true, set: true},
                pastLocations: {get: true, set: true},
                picture: {get: true, set: true},
                pastPictures: {get: true, set: true},
                organization: {get: true, set: true},
                emailIsVerified: {get: true, set: true},
                createdOn: {get: true, set: true},
                updatedOn: {get: true, set: true},

                load: {call: true},
                save: {call: true},
                delete: {call: true}
              }
            })
            class User extends BaseUser {
              @provide() static Picture = Picture;
              @provide() static Organization = Organization;
            }

            const store = new MemoryStore({initialCollections: getInitialCollections()});

            store.registerRootComponent(User);

            return new ComponentServer(User);
          })();

          const client = new ComponentClient(server, {mixins: [Storable]});
          const User = client.getComponent() as typeof BaseUser;

          return User;
        });
      });
    }

    if (true) {
      describe('Without a store', () => {
        testOperations(function () {
          class Picture extends BasePicture {}

          class Organization extends BaseOrganization {}

          class User extends BaseUser {
            @provide() static Picture = Picture;
            @provide() static Organization = Organization;
          }

          return User;
        });
      });
    }

    function testOperations(userClassProvider: () => typeof BaseUser) {
      describe('Storable instances', () => {
        test('get()', async () => {
          const User = userClassProvider();

          if (!(User.hasStore() || User.getRemoteComponent() !== undefined)) {
            await expect(User.fork().get({id: 'user1'})).rejects.toThrow(
              "To be able to execute the load() method (called from get()), a storable component should be registered in a store or have an exposed load() remote method (component: 'User')"
            );

            await expect(User.fork().get({email: '1@user.com'})).rejects.toThrow(
              "To be able to execute the get() method with a secondary identifier, a storable component should be registered in a store or have an exposed get() remote method (component: 'User')"
            );

            return;
          }

          let user = await User.fork().get('user1');

          const expectedSerializedUser = {
            __component: 'User',
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
            picture: {
              __component: 'Picture',
              type: 'JPEG',
              url: 'https://pictures.com/1-2.jpg'
            },
            pastPictures: [
              {
                __component: 'Picture',
                type: 'JPEG',
                url: 'https://pictures.com/1-1.jpg'
              },
              {
                __component: 'Picture',
                type: 'PNG',
                url: 'https://pictures.com/1-1.png'
              }
            ],
            organization: {
              __component: 'Organization',
              id: 'org1',
              slug: 'organization-1',
              name: 'Organization 1'
            },
            emailIsVerified: false,
            createdOn: {__date: CREATED_ON.toISOString()},
            updatedOn: {__undefined: true}
          };

          expect(user.serialize({includeReferencedComponents: true})).toStrictEqual(
            expectedSerializedUser
          );

          user = await User.fork().get({id: 'user1'});

          expect(user.serialize({includeReferencedComponents: true})).toStrictEqual(
            expectedSerializedUser
          );

          user = await User.fork().get({id: 'user1'}, {fullName: true});

          expect(user.serialize()).toStrictEqual({
            __component: 'User',
            id: 'user1',
            fullName: 'User 1'
          });

          user = await User.fork().get({id: 'user1'}, {});

          expect(user.serialize()).toStrictEqual({__component: 'User', id: 'user1'});

          await expect(User.fork().get({id: 'user2'})).rejects.toThrow(
            "Cannot load a component that is missing from the store (component: 'User', id: 'user2')"
          );

          expect(
            await User.fork().get({id: 'user2'}, true, {throwIfMissing: false})
          ).toBeUndefined();

          user = await User.fork().get({email: '1@user.com'});

          expect(user.serialize({includeReferencedComponents: true})).toStrictEqual(
            expectedSerializedUser
          );

          user = await User.fork().get({email: '1@user.com'}, {fullName: true});

          expect(user.serialize()).toStrictEqual({
            __component: 'User',
            id: 'user1',
            email: '1@user.com',
            fullName: 'User 1'
          });

          await expect(User.fork().get({email: '2@user.com'})).rejects.toThrow(
            "Cannot load a component that is missing from the store (component: 'User', email: '2@user.com')"
          );

          user = await User.fork().get({reference: 1}, {fullName: true});

          expect(user.serialize()).toStrictEqual({
            __component: 'User',
            id: 'user1',
            reference: 1,
            fullName: 'User 1'
          });

          await expect(User.fork().get({reference: 2})).rejects.toThrow(
            "Cannot load a component that is missing from the store (component: 'User', reference: 2)"
          );

          await expect(User.fork().get({fullName: 'User 1'})).rejects.toThrow(
            "A property with the specified name was found, but it is not an identifier attribute (attribute: 'User.prototype.fullName')"
          );

          await expect(User.fork().get({name: 'User 1'})).rejects.toThrow(
            "The identifier attribute 'name' is missing (component: 'User')"
          );

          const ForkedUser = User.fork();

          user = new ForkedUser({id: 'user1', email: '1@user.com', reference: 1});

          await expect(ForkedUser.get({id: 'user1'})).rejects.toThrow(
            "Cannot load a storable component that is marked as new (component: 'User')"
          );
        });

        test('has()', async () => {
          const User = userClassProvider();

          if (!(User.hasStore() || User.getRemoteComponent() !== undefined)) {
            await expect(User.fork().has('user1')).rejects.toThrow(
              "To be able to execute the load() method (called from has()), a storable component should be registered in a store or have an exposed load() remote method (component: 'User')"
            );

            await expect(User.fork().has({email: '1@user.com'})).rejects.toThrow(
              "To be able to execute the get() method (called from has()) with a secondary identifier, a storable component should be registered in a store or have an exposed get() remote method (component: 'User')"
            );

            return;
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

          let user: BaseUser;
          let organization: BaseOrganization;

          user = User.fork().instantiate({id: 'user1'});

          if (!(User.hasStore() || User.getRemoteComponent() !== undefined)) {
            return await expect(user.load()).rejects.toThrow(
              "To be able to execute the load() method, a storable component should be registered in a store or have an exposed load() remote method (component: 'User')"
            );
          }

          expect(await user.load({})).toBe(user);
          expect(user.serialize()).toStrictEqual({__component: 'User', id: 'user1'});

          expect(await user.load({email: true})).toBe(user);
          expect(user.serialize()).toStrictEqual({
            __component: 'User',
            id: 'user1',
            email: '1@user.com'
          });

          expect(await user.load()).toBe(user);
          expect(user.serialize({includeReferencedComponents: true})).toStrictEqual({
            __component: 'User',
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
            picture: {
              __component: 'Picture',
              type: 'JPEG',
              url: 'https://pictures.com/1-2.jpg'
            },
            pastPictures: [
              {
                __component: 'Picture',
                type: 'JPEG',
                url: 'https://pictures.com/1-1.jpg'
              },
              {
                __component: 'Picture',
                type: 'PNG',
                url: 'https://pictures.com/1-1.png'
              }
            ],
            organization: {
              __component: 'Organization',
              id: 'org1',
              slug: 'organization-1',
              name: 'Organization 1'
            },
            emailIsVerified: false,
            createdOn: {__date: CREATED_ON.toISOString()},
            updatedOn: {__undefined: true}
          });

          // ------

          user = User.fork().instantiate({id: 'user2'});

          await expect(user.load({})).rejects.toThrow(
            "Cannot load a component that is missing from the store (component: 'User', id: 'user2'"
          );
          expect(await user.load({}, {throwIfMissing: false})).toBeUndefined();

          // ------

          user = User.fork().instantiate({email: '1@user.com'});

          expect(await user.load({})).toBe(user);
          expect(user.serialize()).toStrictEqual({
            __component: 'User',
            id: 'user1',
            email: '1@user.com'
          });

          expect(await user.load({fullName: true})).toBe(user);
          expect(user.serialize()).toStrictEqual({
            __component: 'User',
            id: 'user1',
            email: '1@user.com',
            fullName: 'User 1'
          });

          // ------

          if (User.hasStore()) {
            const store = User.getStore() as Store;

            user = User.fork().instantiate({id: 'user1'});

            store.startTrace();

            expect(await user.load({})).toBe(user);
            expect(store.getTrace()).toStrictEqual([
              {
                operation: 'load',
                params: [
                  user,
                  {
                    attributeSelector: {
                      id: true
                    },
                    throwIfMissing: true
                  }
                ],
                result: user
              }
            ]);

            store.stopTrace();
            store.startTrace();

            expect(await user.load({})).toBe(user);
            expect(store.getTrace()).toStrictEqual([]);

            store.stopTrace();
            store.startTrace();

            expect(await user.load({id: true})).toBe(user);
            expect(store.getTrace()).toStrictEqual([]);

            store.stopTrace();
            store.startTrace();

            expect(await user.load({id: true, email: true})).toBe(user);
            expect(store.getTrace()).toStrictEqual([
              {
                operation: 'load',
                params: [
                  user,
                  {
                    attributeSelector: {email: true},
                    throwIfMissing: true
                  }
                ],
                result: user
              }
            ]);

            store.stopTrace();
            store.startTrace();

            expect(await user.load({id: true, email: true, fullName: true})).toBe(user);
            expect(store.getTrace()).toStrictEqual([
              {
                operation: 'load',
                params: [
                  user,
                  {
                    attributeSelector: {fullName: true},
                    throwIfMissing: true
                  }
                ],
                result: user
              }
            ]);

            store.stopTrace();
            store.startTrace();

            expect(await user.load({id: true, email: true, fullName: true})).toBe(user);
            expect(store.getTrace()).toStrictEqual([]);

            store.stopTrace();
            store.startTrace();

            expect(await user.load({fullName: true}, {reload: true})).toBe(user);
            expect(store.getTrace()).toStrictEqual([
              {
                operation: 'load',
                params: [
                  user,
                  {
                    attributeSelector: {
                      id: true,
                      fullName: true
                    },
                    throwIfMissing: true
                  }
                ],
                result: user
              }
            ]);

            store.stopTrace();
            store.startTrace();

            expect(await user.load({organization: {}})).toBe(user);
            expect(store.getTrace()).toStrictEqual([
              {
                operation: 'load',
                params: [
                  user,
                  {
                    attributeSelector: {organization: {id: true}},
                    throwIfMissing: true
                  }
                ],
                result: user
              }
            ]);

            store.stopTrace();
            store.startTrace();

            expect(await user.load({organization: {}})).toBe(user);
            expect(store.getTrace()).toStrictEqual([]);

            store.stopTrace();
          }

          // ------

          user = User.fork().instantiate({fullName: 'User 1'});

          await expect(user.load({})).rejects.toThrow(
            "Cannot get an identifier descriptor from a component that has no set identifier (component: 'User')"
          );

          user = new (User.fork())({id: 'user1', email: '1@user.com', reference: 1});

          await expect(user.load({})).rejects.toThrow(
            "Cannot load a storable component that is marked as new (component: 'User')"
          );

          // --- With a referenced identifiable component loaded from a fork ---

          const ForkedUser = User.fork();
          organization = await ForkedUser.Organization.get('org1');
          const ForkedUserFork = ForkedUser.fork();
          user = await ForkedUserFork.get('user1', {organization: {}});

          expect(user.organization?.isForkOf(organization));

          // ------

          organization = User.fork().Organization.instantiate(
            {slug: 'organization-1'},
            {source: 'store'}
          );

          expect(await organization.load({})).toBe(organization);
          expect(organization.serialize()).toStrictEqual({
            __component: 'Organization',
            id: 'org1',
            slug: 'organization-1'
          });

          organization = User.fork().Organization.instantiate(
            {slug: 'organization-1'},
            {source: 'store'}
          );

          expect(await organization.load(true)).toBe(organization);
          expect(organization.serialize()).toStrictEqual({
            __component: 'Organization',
            id: 'org1',
            slug: 'organization-1',
            name: 'Organization 1'
          });
        });

        test('save()', async () => {
          const User = userClassProvider();

          let ForkedUser = User.fork();
          let ForkedPicture = ForkedUser.Picture;
          let ForkedOrganization = ForkedUser.Organization;

          let user = new ForkedUser({
            id: 'user2',
            email: '2@user.com',
            reference: 2,
            fullName: 'User 2',
            tags: ['newcomer'],
            location: {country: 'USA', city: 'New York'},
            picture: new ForkedPicture({type: 'JPEG', url: 'https://pictures.com/2-1.jpg'}),
            organization: ForkedOrganization.instantiate({id: 'org2'})
          });

          if (!(User.hasStore() || User.getRemoteComponent() !== undefined)) {
            return await expect(user.save()).rejects.toThrow(
              "To be able to execute the save() method, a storable component should be registered in a store or have an exposed save() remote method (component: 'User')"
            );
          }

          expect(user.isNew()).toBe(true);
          expect(user.picture!.isNew()).toBe(true);
          expect(user.getAttribute('id').getValueSource()).toBe('local');
          expect(user.getAttribute('fullName').getValueSource()).toBe('local');
          expect(user.getAttribute('tags').getValueSource()).toBe('local');
          expect(user.getAttribute('picture').getValueSource()).toBe('local');
          expect(user.picture!.getAttribute('url').getValueSource()).toBe('local');

          expect(await user.save()).toBe(user);

          expect(user.isNew()).toBe(false);
          // TODO: expect(user.picture!.isNew()).toBe(false);
          expect(user.getAttribute('id').getValueSource()).toBe(
            User.hasStore() ? 'store' : 'backend'
          );
          expect(user.getAttribute('fullName').getValueSource()).toBe(
            User.hasStore() ? 'store' : 'backend'
          );
          expect(user.getAttribute('tags').getValueSource()).toBe(
            User.hasStore() ? 'store' : 'backend'
          );
          expect(user.getAttribute('picture').getValueSource()).toBe(
            User.hasStore() ? 'store' : 'backend'
          );
          expect(user.picture!.getAttribute('url').getValueSource()).toBe(
            User.hasStore() ? 'store' : 'backend'
          );

          ForkedUser = User.fork();
          ForkedPicture = ForkedUser.Picture;
          ForkedOrganization = ForkedUser.Organization;

          user = await ForkedUser.get('user2');

          expect(user.serialize({includeReferencedComponents: true})).toStrictEqual({
            __component: 'User',
            id: 'user2',
            email: '2@user.com',
            reference: 2,
            fullName: 'User 2',
            accessLevel: 0,
            tags: ['newcomer'],
            location: {country: 'USA', city: 'New York'},
            pastLocations: [],
            picture: {
              __component: 'Picture',
              type: 'JPEG',
              url: 'https://pictures.com/2-1.jpg'
            },
            pastPictures: [],
            organization: {
              __component: 'Organization',
              id: 'org2',
              slug: 'organization-2',
              name: 'Organization 2'
            },
            emailIsVerified: false,
            createdOn: {__date: CREATED_ON.toISOString()},
            updatedOn: {__undefined: true}
          });

          // ------

          user.fullName = 'User 2 (modified)';
          user.accessLevel = 1;
          user.tags = [];
          user.location!.state = 'New York';
          user.pastLocations.push({country: 'USA', city: 'San Francisco'});
          user.picture!.url = 'https://pictures.com/2-2.jpg';
          user.pastPictures.push(
            new ForkedPicture({type: 'JPEG', url: 'https://pictures.com/2-1.jpg'})
          );
          user.organization = ForkedOrganization.instantiate({id: 'org1'});
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
            organization: true,
            updatedOn: true
          });

          expect(user.serialize({includeReferencedComponents: true})).toStrictEqual({
            __component: 'User',
            id: 'user2',
            fullName: 'User 2 (modified)',
            accessLevel: 1,
            tags: [],
            location: {country: 'USA', state: 'New York', city: 'New York'},
            pastLocations: [{country: 'USA', city: 'San Francisco'}],
            picture: {
              __component: 'Picture',
              type: 'JPEG',
              url: 'https://pictures.com/2-2.jpg'
            },
            pastPictures: [
              {
                __component: 'Picture',
                type: 'JPEG',
                url: 'https://pictures.com/2-1.jpg'
              }
            ],
            organization: {
              __component: 'Organization',
              id: 'org1',
              slug: 'organization-1',
              name: 'Organization 1'
            },
            updatedOn: {__date: UPDATED_ON.toISOString()}
          });

          // ------

          user.location = {country: 'USA'};
          delete user.location.state;
          delete user.location.city;
          delete user.pastLocations[0].city;
          user.picture!.type = undefined;
          user.pastPictures[0].type = undefined;
          user.organization = undefined;
          user.updatedOn = undefined;

          expect(await user.save()).toBe(user);

          user = await User.fork().get('user2', {
            location: true,
            pastLocations: true,
            picture: true,
            pastPictures: true,
            organization: true,
            updatedOn: true
          });

          expect(user.serialize()).toStrictEqual({
            __component: 'User',
            id: 'user2',
            location: {country: 'USA'},
            pastLocations: [{country: 'USA'}],
            picture: {
              __component: 'Picture',
              type: {__undefined: true},
              url: 'https://pictures.com/2-2.jpg'
            },
            pastPictures: [
              {
                __component: 'Picture',
                type: {__undefined: true},
                url: 'https://pictures.com/2-1.jpg'
              }
            ],
            organization: {__undefined: true},
            updatedOn: {__undefined: true}
          });

          // ------

          // Undefined values in object attributes should not be saved
          user.location!.country = undefined;
          user.pastLocations[0].country = undefined;

          expect(await user.save()).toBe(user);

          user = await User.fork().get('user2', {location: true, pastLocations: true});

          expect(user.serialize()).toStrictEqual({
            __component: 'User',
            id: 'user2',
            location: {},
            pastLocations: [{}]
          });

          // ------

          if (User.hasStore()) {
            const store = User.getStore() as Store;

            user = await User.fork().get('user2', {fullName: true, accessLevel: true});

            expect(user.serialize()).toStrictEqual({
              __component: 'User',
              id: 'user2',
              fullName: 'User 2 (modified)',
              accessLevel: 1
            });

            user.accessLevel = 2;

            store.startTrace();

            expect(await user.save()).toBe(user);

            expect(store.getTrace()).toStrictEqual([
              {
                operation: 'save',
                params: [
                  user,
                  {
                    attributeSelector: {id: true, accessLevel: true},
                    throwIfMissing: true,
                    throwIfExists: false
                  }
                ],
                result: user
              }
            ]);

            store.stopTrace();

            user = await User.fork().get('user2', {fullName: true, accessLevel: true});

            expect(user.serialize()).toStrictEqual({
              __component: 'User',
              id: 'user2',
              fullName: 'User 2 (modified)',
              accessLevel: 2
            });

            store.startTrace();

            expect(await user.save()).toBe(user);

            expect(store.getTrace()).toStrictEqual([]);

            store.stopTrace();
          }

          // ------

          user = await User.fork().get('user2', {pastPictures: {type: true}});

          expect(user.serialize()).toStrictEqual({
            __component: 'User',
            id: 'user2',
            pastPictures: [{__component: 'Picture', type: {__undefined: true}}]
          });

          user.pastPictures[0].type = 'JPEG';

          await expect(user.save()).rejects.toThrow(
            "Cannot save an array item that has some unset attributes (component: 'User.Picture')"
          );

          await expect(user.save({pastPictures: {type: true}})).rejects.toThrow(
            "Cannot save an array item that has some unset attributes (component: 'User.Picture')"
          );

          // ------

          user = User.fork().instantiate({id: 'user3', fullName: 'User 3'});

          expect(await user.save(true, {throwIfMissing: false})).toBe(undefined);
          await expect(user.save()).rejects.toThrow(
            "Cannot save a non-new component that is missing from the store (component: 'User', id: 'user3')"
          );

          // ------

          user = new (User.fork())({
            id: 'user1',
            email: '1@user.com',
            reference: 1,
            fullName: 'User 1 (modified)'
          });

          expect(await user.save(true, {throwIfExists: false})).toBe(undefined);
          await expect(user.save()).rejects.toThrow(
            "Cannot save a new component that already exists in the store (component: 'User', id: 'user1')"
          );

          // ------

          user = User.fork().instantiate({id: 'user3', fullName: 'User 3'});

          await expect(
            user.save(true, {throwIfMissing: true, throwIfExists: true})
          ).rejects.toThrow(
            "The 'throwIfMissing' and 'throwIfExists' options cannot be both set to true"
          );

          // ------

          if (User.hasStore() && User.getStore() instanceof MongoDBStore) {
            user = new (User.fork())({
              id: 'user3',
              email: '1@user.com',
              reference: 3
            });

            await expect(user.save()).rejects.toThrow(
              "Cannot save a component with an attribute value that should be unique but already exists in the store (component: 'User', id: 'user3', index: 'email [unique]')"
            );

            user = User.fork().instantiate({id: 'user2', reference: 1});

            await expect(user.save()).rejects.toThrow(
              "Cannot save a component with an attribute value that should be unique but already exists in the store (component: 'User', id: 'user2', index: 'reference [unique]')"
            );
          }
        });

        test('delete()', async () => {
          const User = userClassProvider();

          let user = User.fork().instantiate({id: 'user1'});

          if (!(User.hasStore() || User.getRemoteComponent() !== undefined)) {
            return await expect(user.delete()).rejects.toThrow(
              "To be able to execute the delete() method, a storable component should be registered in a store or have an exposed delete() remote method (component: 'User')"
            );
          }

          expect(user.getIsDeletedMark()).toBe(false);
          expect(await user.delete()).toBe(user);
          expect(user.getIsDeletedMark()).toBe(true);

          await expect(user.delete()).rejects.toThrow(
            "Cannot delete a component that is missing from the store (component: 'User', id: 'user1'"
          );

          expect(await user.delete({throwIfMissing: false})).toBeUndefined();

          user = new (User.fork())({id: 'user1', email: '1@user.com', reference: 1});

          await expect(user.delete()).rejects.toThrow(
            "Cannot delete a storable component that is new (component: 'User')"
          );
        });

        test('find()', async () => {
          const User = userClassProvider();

          if (!(User.hasStore() || User.getRemoteComponent() !== undefined)) {
            return await expect(User.fork().find()).rejects.toThrow(
              "To be able to execute the find() method, a storable component should be registered in a store or have an exposed find() remote method (component: 'User')"
            );
          }

          // === Simple queries ===

          // --- Without a query ---

          let users = await User.fork().find();

          expect(serialize(users, {includeReferencedComponents: true})).toStrictEqual([
            {
              __component: 'User',
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
              picture: {
                __component: 'Picture',
                type: 'JPEG',
                url: 'https://pictures.com/1-2.jpg'
              },
              pastPictures: [
                {
                  __component: 'Picture',
                  type: 'JPEG',
                  url: 'https://pictures.com/1-1.jpg'
                },
                {
                  __component: 'Picture',
                  type: 'PNG',
                  url: 'https://pictures.com/1-1.png'
                }
              ],
              organization: {
                __component: 'Organization',
                id: 'org1',
                slug: 'organization-1',
                name: 'Organization 1'
              },
              emailIsVerified: false,
              createdOn: {__date: CREATED_ON.toISOString()},
              updatedOn: {__undefined: true}
            },
            {
              __component: 'User',
              id: 'user11',
              email: '11@user.com',
              reference: 11,
              fullName: 'User 11',
              accessLevel: 3,
              tags: ['owner', 'admin'],
              location: {country: 'USA'},
              pastLocations: [{country: 'France'}],
              picture: {
                __component: 'Picture',
                type: 'JPEG',
                url: 'https://pictures.com/11-1.jpg'
              },
              pastPictures: [
                {
                  __component: 'Picture',
                  type: 'PNG',
                  url: 'https://pictures.com/11-1.png'
                }
              ],
              organization: {
                __component: 'Organization',
                id: 'org2',
                slug: 'organization-2',
                name: 'Organization 2'
              },
              emailIsVerified: true,
              createdOn: {__date: CREATED_ON.toISOString()},
              updatedOn: {__undefined: true}
            },
            {
              __component: 'User',
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
              picture: {
                __component: 'Picture',
                type: 'PNG',
                url: 'https://pictures.com/12-3.png'
              },
              pastPictures: [
                {
                  __component: 'Picture',
                  type: 'PNG',
                  url: 'https://pictures.com/12-2.png'
                },
                {
                  __component: 'Picture',
                  type: 'PNG',
                  url: 'https://pictures.com/12-1.png'
                }
              ],
              organization: {
                __component: 'Organization',
                id: 'org2'
              },
              emailIsVerified: true,
              createdOn: {__date: CREATED_ON.toISOString()},
              updatedOn: {__undefined: true}
            },
            {
              __component: 'User',
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
              organization: {__undefined: true},
              emailIsVerified: false,
              createdOn: {__date: CREATED_ON.toISOString()},
              updatedOn: {__undefined: true}
            }
          ]);

          // --- With a simple query ---

          users = await User.fork().find({fullName: 'User 12'});

          expect(serialize(users, {includeReferencedComponents: true})).toStrictEqual([
            {
              __component: 'User',
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
              picture: {
                __component: 'Picture',
                type: 'PNG',
                url: 'https://pictures.com/12-3.png'
              },
              pastPictures: [
                {
                  __component: 'Picture',
                  type: 'PNG',
                  url: 'https://pictures.com/12-2.png'
                },
                {
                  __component: 'Picture',
                  type: 'PNG',
                  url: 'https://pictures.com/12-1.png'
                }
              ],
              organization: {
                __component: 'Organization',
                id: 'org2',
                slug: 'organization-2',
                name: 'Organization 2'
              },
              emailIsVerified: true,
              createdOn: {__date: CREATED_ON.toISOString()},
              updatedOn: {__undefined: true}
            }
          ]);

          // --- With an attribute selector ---

          users = await User.fork().find({accessLevel: 3}, {email: true});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user11', email: '11@user.com'},
            {__component: 'User', id: 'user13', email: '13@user.com'}
          ]);

          users = await User.fork().find({emailIsVerified: false}, {email: true});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1', email: '1@user.com'},
            {__component: 'User', id: 'user13', email: '13@user.com'}
          ]);

          // --- With a query involving two attributes ---

          users = await User.fork().find({accessLevel: 3, emailIsVerified: true}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user11'}]);

          // --- With 'sort' ---

          users = await User.fork().find({}, {accessLevel: true}, {sort: {accessLevel: 'asc'}});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1', accessLevel: 0},
            {__component: 'User', id: 'user12', accessLevel: 1},
            {__component: 'User', id: 'user11', accessLevel: 3},
            {__component: 'User', id: 'user13', accessLevel: 3}
          ]);

          users = await User.fork().find({}, {accessLevel: true}, {sort: {accessLevel: 'desc'}});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user11', accessLevel: 3},
            {__component: 'User', id: 'user13', accessLevel: 3},
            {__component: 'User', id: 'user12', accessLevel: 1},
            {__component: 'User', id: 'user1', accessLevel: 0}
          ]);

          users = await User.fork().find(
            {},
            {reference: true, accessLevel: true},
            {sort: {accessLevel: 'asc', reference: 'desc'}}
          );

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1', reference: 1, accessLevel: 0},
            {__component: 'User', id: 'user12', reference: 12, accessLevel: 1},
            {__component: 'User', id: 'user13', reference: 13, accessLevel: 3},
            {__component: 'User', id: 'user11', reference: 11, accessLevel: 3}
          ]);

          // --- With 'skip' ---

          users = await User.fork().find({}, {}, {skip: 2});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user12'},
            {__component: 'User', id: 'user13'}
          ]);

          // --- With 'limit' ---

          users = await User.fork().find({}, {}, {limit: 2});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1'},
            {__component: 'User', id: 'user11'}
          ]);

          // --- With 'skip' and 'limit' ---

          users = await User.fork().find({}, {}, {skip: 1, limit: 2});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user11'},
            {__component: 'User', id: 'user12'}
          ]);

          // --- With 'sort', 'skip', and 'limit' ---

          users = await User.fork().find({}, {}, {sort: {id: 'desc'}, skip: 1, limit: 2});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user12'},
            {__component: 'User', id: 'user11'}
          ]);

          await expect(User.fork().find({unknownAttribute: 1})).rejects.toThrow(
            "An unknown attribute was specified in a query (component: 'User', attribute: 'unknownAttribute')"
          );

          // === Advanced queries ===

          // --- With a basic operator ---

          // - '$equal' -

          users = await User.fork().find({accessLevel: {$equal: 0}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user1'}]);

          await expect(User.fork().find({accessLevel: {$equal: /0/}}, {})).rejects.toThrow(
            "Expected a scalar value of the operator '$equal', but received a value of type 'RegExp' (query: '{\"accessLevel\":{\"$equal\":{}}}')"
          );

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user1'}]);

          // - '$notEqual' -

          users = await User.fork().find({accessLevel: {$notEqual: 3}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1'},
            {__component: 'User', id: 'user12'}
          ]);

          // - '$greaterThan' -

          users = await User.fork().find({accessLevel: {$greaterThan: 3}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({accessLevel: {$greaterThan: 2}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user11'},
            {__component: 'User', id: 'user13'}
          ]);

          // - '$greaterThanOrEqual' -

          users = await User.fork().find({accessLevel: {$greaterThanOrEqual: 3}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user11'},
            {__component: 'User', id: 'user13'}
          ]);

          // - '$lessThan' -

          users = await User.fork().find({accessLevel: {$lessThan: 1}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user1'}]);

          // - '$lessThanOrEqual' -

          users = await User.fork().find({accessLevel: {$lessThanOrEqual: 1}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1'},
            {__component: 'User', id: 'user12'}
          ]);

          // - '$in' -

          users = await User.fork().find({accessLevel: {$in: []}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({accessLevel: {$in: [2, 4, 5]}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({accessLevel: {$in: [0, 1]}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1'},
            {__component: 'User', id: 'user12'}
          ]);

          // --- With two basic operators ---

          users = await User.fork().find({accessLevel: {$greaterThan: 1, $lessThan: 3}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({accessLevel: {$greaterThanOrEqual: 0, $lessThan: 2}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1'},
            {__component: 'User', id: 'user12'}
          ]);

          // --- With an impossible expression ---

          users = await User.fork().find({accessLevel: {$greaterThan: 1, $equal: 1}}, {});

          expect(serialize(users)).toStrictEqual([]);

          // --- With a string operator ---

          // - '$includes' -

          users = await User.fork().find({email: {$includes: '.org'}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({email: {$includes: '2'}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user12'}]);

          await expect(User.fork().find({email: {$includes: 2}}, {})).rejects.toThrow(
            "Expected a string as value of the operator '$includes', but received a value of type 'number' (query: '{\"email\":{\"$includes\":2}}')"
          );

          // - '$startsWith' -

          users = await User.fork().find({email: {$startsWith: '2'}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({email: {$startsWith: '1@'}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user1'}]);

          // - '$endsWith' -

          users = await User.fork().find({location: {city: {$endsWith: 'town'}}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({location: {city: {$endsWith: 'ris'}}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1'},
            {__component: 'User', id: 'user12'}
          ]);

          // - '$matches' -

          users = await User.fork().find({location: {country: {$matches: /usa/}}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({location: {country: {$matches: /usa/i}}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1'},
            {__component: 'User', id: 'user11'}
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
            {__component: 'User', id: 'user11'},
            {__component: 'User', id: 'user13'}
          ]);

          // - '$and' -

          users = await User.fork().find({$and: [{tags: 'owner'}, {emailIsVerified: false}]}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({$and: [{tags: 'admin'}, {emailIsVerified: true}]}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user11'}]);

          // - '$or' -

          users = await User.fork().find(
            {$or: [{accessLevel: {$lessThan: 0}}, {accessLevel: {$greaterThan: 3}}]},
            {}
          );

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({$or: [{accessLevel: 0}, {accessLevel: 1}]}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1'},
            {__component: 'User', id: 'user12'}
          ]);

          // - '$nor' -

          users = await User.fork().find(
            {$nor: [{emailIsVerified: false}, {emailIsVerified: true}]},
            {}
          );

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({$nor: [{accessLevel: 0}, {accessLevel: 1}]}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user11'},
            {__component: 'User', id: 'user13'}
          ]);

          // --- With an object attribute ---

          users = await User.fork().find({location: {country: 'Japan'}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({location: {country: 'France'}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user12'}]);

          users = await User.fork().find({location: {country: 'USA'}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1'},
            {__component: 'User', id: 'user11'}
          ]);

          users = await User.fork().find({location: {country: 'USA', city: 'Paris'}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user1'}]);

          users = await User.fork().find({location: undefined}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user13'}]);

          // --- With an array attribute ---

          // - '$some' -

          users = await User.fork().find({tags: {$some: 'angel'}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({tags: {$some: 'blocked'}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user1'}]);

          users = await User.fork().find({tags: {$some: 'admin'}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user11'},
            {__component: 'User', id: 'user13'}
          ]);

          // '$some' should be implicit
          users = await User.fork().find({tags: 'admin'}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user11'},
            {__component: 'User', id: 'user13'}
          ]);

          // '$includes' should be replaced by '$some' when '$some' is missing
          users = await User.fork().find({tags: {$includes: 'admin'}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user11'},
            {__component: 'User', id: 'user13'}
          ]);

          // When '$some' is present, '$includes' remains a string operator
          users = await User.fork().find({tags: {$some: {$includes: 'lock'}}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user1'}]);

          // - '$every' -

          users = await User.fork().find({tags: {$every: 'admin'}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user12'},
            {__component: 'User', id: 'user13'}
          ]);

          // - '$length' -

          users = await User.fork().find({tags: {$length: 3}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({tags: {$length: 0}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user12'}]);

          users = await User.fork().find({tags: {$length: 2}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1'},
            {__component: 'User', id: 'user11'}
          ]);

          // --- With an array of object attribute ---

          users = await User.fork().find({pastLocations: {country: 'Canada'}}, {});

          expect(serialize(users)).toStrictEqual([]);

          users = await User.fork().find({pastLocations: {country: 'Japan'}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user12'}]);

          users = await User.fork().find({pastLocations: {country: 'France'}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user11'},
            {__component: 'User', id: 'user12'}
          ]);

          users = await User.fork().find({pastLocations: {country: 'USA', city: 'Nice'}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user1'}]);

          users = await User.fork().find({pastLocations: {city: undefined}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user11'}]);

          // --- With an array of embedded components ---

          // - '$some' -

          users = await User.fork().find({pastPictures: {type: 'JPEG'}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user1'}]);

          users = await User.fork().find({pastPictures: {type: 'PNG'}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1'},
            {__component: 'User', id: 'user11'},
            {__component: 'User', id: 'user12'}
          ]);

          // - '$length' -

          users = await User.fork().find({pastPictures: {$length: 0}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user13'}]);

          users = await User.fork().find({pastPictures: {$length: 1}}, {});

          expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user11'}]);

          users = await User.fork().find({pastPictures: {$length: 2}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1'},
            {__component: 'User', id: 'user12'}
          ]);

          users = await User.fork().find({pastPictures: {$length: 3}}, {});

          expect(serialize(users)).toStrictEqual([]);

          // --- With a component specified as query ---

          let ForkedUser = User.fork();

          const user = await ForkedUser.get('user1', {email: true});

          users = await ForkedUser.find(user, {fullName: true});

          expect(users).toHaveLength(1);
          expect(users[0]).toBe(user);
          expect(serialize(user)).toStrictEqual({
            __component: 'User',
            id: 'user1',
            email: '1@user.com',
            fullName: 'User 1'
          });

          // --- With an a referenced component specified in a query ---

          ForkedUser = User.fork();

          const organization = await ForkedUser.Organization.get('org2');

          users = await ForkedUser.find({organization}, {});

          expect(serialize(users)).toStrictEqual([
            {
              __component: 'User',
              id: 'user11'
            },
            {
              __component: 'User',
              id: 'user12'
            }
          ]);

          // --- With an array of referenced components specified in a query (using '$in') ---

          ForkedUser = User.fork();

          const organization1 = ForkedUser.Organization.instantiate({id: 'org1'});
          const organization2 = ForkedUser.Organization.instantiate({id: 'org2'});

          users = await ForkedUser.find({organization: {$in: [organization1, organization2]}}, {});

          expect(serialize(users)).toStrictEqual([
            {__component: 'User', id: 'user1'},
            {__component: 'User', id: 'user11'},
            {__component: 'User', id: 'user12'}
          ]);
        });

        test('count()', async () => {
          const User = userClassProvider();

          if (!(User.hasStore() || User.getRemoteComponent() !== undefined)) {
            return await expect(User.fork().count()).rejects.toThrow(
              "To be able to execute the count() method, a storable component should be registered in a store or have an exposed count() remote method (component: 'User')"
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

          expect(await User.fork().count({tags: 'admin'})).toBe(2);

          // --- With a component specified as query ---

          const ForkedUser = User.fork();

          const user = ForkedUser.instantiate({fullName: 'User 1'});

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

      let user = User.fork().instantiate({id: 'user1'});
      await user.load({});

      expect(user.getAttribute('firstName').isSet()).toBe(false);

      user = User.fork().instantiate({id: 'user1'});
      await user.load({firstName: true});

      expect(user.firstName).toBe('User');

      user = User.fork().instantiate({id: 'user1'});
      await user.load({fullName: true, firstName: true});

      expect(user.serialize()).toStrictEqual({
        __component: 'User',
        id: 'user1',
        fullName: 'User 1',
        firstName: 'User'
      });
    });

    function getUserClass() {
      class Picture extends BasePicture {}

      class Organization extends BaseOrganization {}

      class User extends BaseUser {
        @provide() static Picture = Picture;
        @provide() static Organization = Organization;

        @loader(async function (this: User) {
          await this.load({fullName: true});

          const firstName = this.fullName.split(' ')[0];

          return firstName;
        })
        @attribute('string')
        firstName!: string;
      }

      const store = new MemoryStore({initialCollections: getInitialCollections()});

      store.registerRootComponent(User);

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

      expect(serialize(users)).toStrictEqual([{__component: 'User', id: 'user1'}]);

      users = await User.fork().find({hasNoAccess: true}, {hasNoAccess: true});

      expect(serialize(users)).toStrictEqual([
        {__component: 'User', id: 'user1', accessLevel: 0, hasNoAccess: true}
      ]);

      users = await User.fork().find({hasAccessLevel: 3}, {});

      expect(serialize(users)).toStrictEqual([
        {__component: 'User', id: 'user11'},
        {__component: 'User', id: 'user13'}
      ]);
    });

    function getUserClass() {
      class Picture extends BasePicture {}

      class Organization extends BaseOrganization {}

      class User extends BaseUser {
        @provide() static Picture = Picture;
        @provide() static Organization = Organization;

        @loader(async function (this: User) {
          await this.load({accessLevel: true});

          return this.accessLevel === 0;
        })
        @finder(async function () {
          return {accessLevel: 0};
        })
        @attribute('boolean?')
        hasNoAccess?: string;

        @finder(async function (accessLevel) {
          return {accessLevel};
        })
        @method()
        async hasAccessLevel(accessLevel: number) {
          await this.load({accessLevel: true});

          return this.accessLevel === accessLevel;
        }
      }

      const store = new MemoryStore({initialCollections: getInitialCollections()});

      store.registerRootComponent(User);

      return User;
    }
  });

  describe('Hooks', () => {
    test('getStorableAttributesWithHook()', async () => {
      const User = getUserClass();

      const getAttributesWithHook = (
        storable: StorableComponent,
        name: StorableAttributeHookName,
        {
          attributeSelector = true,
          setAttributesOnly = false
        }: {attributeSelector?: AttributeSelector; setAttributesOnly?: boolean} = {}
      ) =>
        Array.from(
          storable.getStorableAttributesWithHook(name, {attributeSelector, setAttributesOnly})
        ).map((attribute) => attribute.getName());

      expect(getAttributesWithHook(User.prototype, 'beforeLoad')).toEqual(['email', 'fullName']);

      const user = User.fork().instantiate({id: 'user1'});

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

      const user = User.fork().instantiate({id: 'user1'});

      expect(hookTracker.get(user, 'beforeLoadHasBeenCalled')).toBeUndefined();
      expect(hookTracker.get(user, 'afterLoadHasBeenCalled')).toBeUndefined();
      expect(
        hookTracker.get(user.getAttribute('email'), 'beforeLoadHasBeenCalled')
      ).toBeUndefined();
      expect(hookTracker.get(user.getAttribute('email'), 'afterLoadHasBeenCalled')).toBeUndefined();
      expect(
        hookTracker.get(user.getAttribute('fullName'), 'beforeLoadHasBeenCalled')
      ).toBeUndefined();
      expect(
        hookTracker.get(user.getAttribute('fullName'), 'afterLoadHasBeenCalled')
      ).toBeUndefined();

      await user.load();

      expect(hookTracker.get(user, 'beforeLoadHasBeenCalled')).toBe(true);
      expect(hookTracker.get(user, 'afterLoadHasBeenCalled')).toBe(true);
      expect(hookTracker.get(user.getAttribute('email'), 'beforeLoadHasBeenCalled')).toBe(true);
      expect(hookTracker.get(user.getAttribute('email'), 'afterLoadHasBeenCalled')).toBe(true);
      expect(hookTracker.get(user.getAttribute('fullName'), 'beforeLoadHasBeenCalled')).toBe(true);
      expect(hookTracker.get(user.getAttribute('fullName'), 'afterLoadHasBeenCalled')).toBe(true);
    });

    test('beforeSave() and afterSave()', async () => {
      const User = getUserClass();

      const user = await User.fork().get('user1');

      user.fullName = 'User 1 (modified)';

      expect(hookTracker.get(user, 'beforeSaveHasBeenCalled')).toBeUndefined();
      expect(hookTracker.get(user, 'afterSaveHasBeenCalled')).toBeUndefined();
      expect(
        hookTracker.get(user.getAttribute('email'), 'beforeSaveHasBeenCalled')
      ).toBeUndefined();
      expect(hookTracker.get(user.getAttribute('email'), 'afterSaveHasBeenCalled')).toBeUndefined();
      expect(
        hookTracker.get(user.getAttribute('fullName'), 'beforeSaveHasBeenCalled')
      ).toBeUndefined();
      expect(
        hookTracker.get(user.getAttribute('fullName'), 'afterSaveHasBeenCalled')
      ).toBeUndefined();

      await user.save();

      expect(hookTracker.get(user, 'beforeSaveHasBeenCalled')).toBe(true);
      expect(hookTracker.get(user, 'afterSaveHasBeenCalled')).toBe(true);
      expect(
        hookTracker.get(user.getAttribute('email'), 'beforeSaveHasBeenCalled')
      ).toBeUndefined();
      expect(hookTracker.get(user.getAttribute('email'), 'afterSaveHasBeenCalled')).toBeUndefined();
      expect(hookTracker.get(user.getAttribute('fullName'), 'beforeSaveHasBeenCalled')).toBe(true);
      expect(hookTracker.get(user.getAttribute('fullName'), 'afterSaveHasBeenCalled')).toBe(true);
    });

    test('beforeDelete() and afterDelete()', async () => {
      const User = getUserClass();

      const user = await User.fork().get('user1');

      expect(hookTracker.get(user, 'beforeDeleteHasBeenCalled')).toBeUndefined();
      expect(hookTracker.get(user, 'afterDeleteHasBeenCalled')).toBeUndefined();
      expect(
        hookTracker.get(user.getAttribute('email'), 'beforeDeleteHasBeenCalled')
      ).toBeUndefined();
      expect(
        hookTracker.get(user.getAttribute('email'), 'afterDeleteHasBeenCalled')
      ).toBeUndefined();
      expect(
        hookTracker.get(user.getAttribute('fullName'), 'beforeDeleteHasBeenCalled')
      ).toBeUndefined();
      expect(
        hookTracker.get(user.getAttribute('fullName'), 'afterDeleteHasBeenCalled')
      ).toBeUndefined();

      await user.delete();

      expect(hookTracker.get(user, 'beforeDeleteHasBeenCalled')).toBe(true);
      expect(hookTracker.get(user, 'afterDeleteHasBeenCalled')).toBe(true);
      expect(hookTracker.get(user.getAttribute('email'), 'beforeDeleteHasBeenCalled')).toBe(true);
      expect(hookTracker.get(user.getAttribute('email'), 'afterDeleteHasBeenCalled')).toBe(true);
      expect(hookTracker.get(user.getAttribute('fullName'), 'beforeDeleteHasBeenCalled')).toBe(
        true
      );
      expect(hookTracker.get(user.getAttribute('fullName'), 'afterDeleteHasBeenCalled')).toBe(true);
    });

    function getUserClass() {
      class Picture extends BasePicture {}

      class Organization extends BaseOrganization {}

      class User extends BaseUser {
        @provide() static Picture = Picture;
        @provide() static Organization = Organization;

        @secondaryIdentifier('string', {
          beforeLoad(this: User) {
            hookTracker.set(this.getAttribute('email'), 'beforeLoadHasBeenCalled', true);
          },
          afterLoad(this: User) {
            hookTracker.set(this.getAttribute('email'), 'afterLoadHasBeenCalled', true);
          },
          beforeSave(this: User) {
            hookTracker.set(this.getAttribute('email'), 'beforeSaveHasBeenCalled', true);
          },
          afterSave(this: User) {
            hookTracker.set(this.getAttribute('email'), 'afterSaveHasBeenCalled', true);
          },
          beforeDelete(this: User) {
            hookTracker.set(this.getAttribute('email'), 'beforeDeleteHasBeenCalled', true);
          },
          afterDelete(this: User) {
            hookTracker.set(this.getAttribute('email'), 'afterDeleteHasBeenCalled', true);
          }
        })
        email!: string;

        @attribute('string', {
          beforeLoad(this: User) {
            hookTracker.set(this.getAttribute('fullName'), 'beforeLoadHasBeenCalled', true);
          },
          afterLoad(this: User) {
            hookTracker.set(this.getAttribute('fullName'), 'afterLoadHasBeenCalled', true);
          },
          beforeSave(this: User) {
            hookTracker.set(this.getAttribute('fullName'), 'beforeSaveHasBeenCalled', true);
          },
          afterSave(this: User) {
            hookTracker.set(this.getAttribute('fullName'), 'afterSaveHasBeenCalled', true);
          },
          beforeDelete(this: User) {
            hookTracker.set(this.getAttribute('fullName'), 'beforeDeleteHasBeenCalled', true);
          },
          afterDelete(this: User) {
            hookTracker.set(this.getAttribute('fullName'), 'afterDeleteHasBeenCalled', true);
          }
        })
        fullName!: string;

        async beforeLoad(attributeSelector: AttributeSelector) {
          await super.beforeLoad(attributeSelector);

          hookTracker.set(this, 'beforeLoadHasBeenCalled', true);
        }

        async afterLoad(attributeSelector: AttributeSelector) {
          await super.afterLoad(attributeSelector);

          hookTracker.set(this, 'afterLoadHasBeenCalled', true);
        }

        async beforeSave(attributeSelector: AttributeSelector) {
          await super.beforeSave(attributeSelector);

          hookTracker.set(this, 'beforeSaveHasBeenCalled', true);
        }

        async afterSave(attributeSelector: AttributeSelector) {
          await super.afterSave(attributeSelector);

          hookTracker.set(this, 'afterSaveHasBeenCalled', true);
        }

        async beforeDelete(attributeSelector: AttributeSelector) {
          await super.beforeDelete(attributeSelector);

          hookTracker.set(this, 'beforeDeleteHasBeenCalled', true);
        }

        async afterDelete(attributeSelector: AttributeSelector) {
          await super.afterDelete(attributeSelector);

          hookTracker.set(this, 'afterDeleteHasBeenCalled', true);
        }
      }

      const store = new MemoryStore({initialCollections: getInitialCollections()});

      store.registerRootComponent(User);

      return User;
    }

    const hookTrackerMap = new WeakMap<object, {[name: string]: any}>();

    const hookTracker = {
      get(target: object, name: string) {
        return hookTrackerMap.get(target)?.[name];
      },
      set(target: object, name: string, value: any) {
        let tracker = hookTrackerMap.get(target);
        if (tracker === undefined) {
          tracker = {};
          hookTrackerMap.set(target, tracker);
        }
        tracker[name] = value;
      }
    };
  });
});

import {MongoClient} from 'mongodb';
import mapKeys from 'lodash/mapKeys';
import {deleteUndefinedProperties} from 'core-helpers';

export const CREATED_ON = new Date('2020-03-22T01:27:42.612Z');
export const UPDATED_ON = new Date('2020-03-22T01:29:33.673Z');

export function getInitialCollections() {
  return {
    User: [
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
        tags: ['owner', 'admin'],
        location: {country: 'USA'},
        pastLocations: [{country: 'France'}],
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
        tags: [],
        location: {country: 'France', city: 'Paris'},
        pastLocations: [
          {country: 'France', city: 'Nice'},
          {country: 'Japan', city: 'Tokyo'}
        ],
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
        tags: ['admin'],
        location: undefined,
        pastLocations: [],
        emailIsVerified: false,
        createdOn: CREATED_ON,
        updatedOn: undefined
      }
    ]
  };
}

export async function seedMongoDB(connectionString) {
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

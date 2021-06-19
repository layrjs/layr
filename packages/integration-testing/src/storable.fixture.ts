import {MongoClient} from 'mongodb';
import mapKeys from 'lodash/mapKeys';

export const CREATED_ON = new Date('2020-03-22T01:27:42.612Z');
export const UPDATED_ON = new Date('2020-03-22T01:29:33.673Z');

export function getInitialCollections() {
  return {
    User: [
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
        picture: {__component: 'Picture', type: 'JPEG', url: 'https://pictures.com/1-2.jpg'},
        pastPictures: [
          {__component: 'Picture', type: 'JPEG', url: 'https://pictures.com/1-1.jpg'},
          {__component: 'Picture', type: 'PNG', url: 'https://pictures.com/1-1.png'}
        ],
        organization: {__component: 'Organization', id: 'org1'},
        emailIsVerified: false,
        createdOn: CREATED_ON
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
        picture: {__component: 'Picture', type: 'JPEG', url: 'https://pictures.com/11-1.jpg'},
        pastPictures: [{__component: 'Picture', type: 'PNG', url: 'https://pictures.com/11-1.png'}],
        organization: {__component: 'Organization', id: 'org2'},
        emailIsVerified: true,
        createdOn: CREATED_ON
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
        picture: {__component: 'Picture', type: 'PNG', url: 'https://pictures.com/12-3.png'},
        pastPictures: [
          {__component: 'Picture', type: 'PNG', url: 'https://pictures.com/12-2.png'},
          {__component: 'Picture', type: 'PNG', url: 'https://pictures.com/12-1.png'}
        ],
        organization: {__component: 'Organization', id: 'org2'},
        emailIsVerified: true,
        createdOn: CREATED_ON
      },
      {
        __component: 'User',
        id: 'user13',
        email: '13@user.com',
        reference: 13,
        fullName: 'User 13',
        accessLevel: 3,
        tags: ['admin'],
        pastLocations: [],
        pastPictures: [],
        emailIsVerified: false,
        createdOn: CREATED_ON
      }
    ],
    Organization: [
      {
        __component: 'Organization',
        id: 'org1',
        slug: 'organization-1',
        name: 'Organization 1'
      },
      {
        __component: 'Organization',
        id: 'org2',
        slug: 'organization-2',
        name: 'Organization 2'
      }
    ]
  };
}

export async function seedMongoDB(connectionString: string) {
  const client = await MongoClient.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const initialCollections = getInitialCollections();

  for (const [collectionName, serializedStorables] of Object.entries(initialCollections)) {
    const collection = client.db().collection(collectionName);

    for (const serializedStorable of serializedStorables) {
      const document = mapKeys(serializedStorable, (_, name) => (name === 'id' ? '_id' : name));
      await collection.insertOne(document);
    }
  }

  await client.close();
}

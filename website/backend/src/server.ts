import {ComponentServer} from '@liaison/component-server';
import {MongoDBStore} from '@liaison/mongodb-store';

import {Backend} from './components/backend';

const connectionString = process.env.MONGODB_STORE_CONNECTION_STRING;

if (!connectionString) {
  throw new Error(`'MONGODB_STORE_CONNECTION_STRING' environment variable is missing`);
}

const store = new MongoDBStore(connectionString);
store.registerRootComponent(Backend);

export const server = new ComponentServer(Backend);

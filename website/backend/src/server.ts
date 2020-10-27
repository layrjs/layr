import {ComponentServer} from '@layr/component-server';
import {MongoDBStore} from '@layr/mongodb-store';

import {Application} from './components/application';

const connectionString = process.env.MONGODB_STORE_CONNECTION_STRING;

if (!connectionString) {
  throw new Error(`'MONGODB_STORE_CONNECTION_STRING' environment variable is missing`);
}

const store = new MongoDBStore(connectionString);
store.registerRootComponent(Application);

export const server = new ComponentServer(Application);

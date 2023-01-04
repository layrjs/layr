import {MongoDBStore} from '@layr/mongodb-store';

import {Application} from './components/application';

export default () => {
  const store = new MongoDBStore(process.env.DATABASE_URL);

  store.registerRootComponent(Application);

  return Application;
};

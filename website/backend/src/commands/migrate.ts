import {Application} from '../components/application';
import {createStore} from '../store';

async function migrate() {
  const store = createStore(Application);

  await store.migrateStorables();

  await store.disconnect();
}

migrate();

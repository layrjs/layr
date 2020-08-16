import {ComponentHTTPClient} from '@liaison/component-http-client';
import {Storable} from '@liaison/storable';

(async () => {
  const client = new ComponentHTTPClient('http://localhost:3210', {mixins: [Storable]});

  const Entry = await client.getComponent();

  const message = process.argv[2];

  if (message) {
    addEntry(message);
  } else {
    showEntries();
  }

  async function addEntry(message) {
    const entry = new Entry({message});
    await entry.save();
    console.log(`Entry successfully added`);
  }

  async function showEntries() {
    const entries = await Entry.find(
      {},
      {message: true, createdAt: true},
      {sort: {createdAt: 'desc'}}
    );

    for (const entry of entries) {
      console.log(`[${entry.createdAt.toISOString()}] ${entry.message}`);
    }
  }
})();

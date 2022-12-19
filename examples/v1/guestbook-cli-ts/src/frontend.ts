import {ComponentHTTPClient} from '@layr/component-http-client';
import {Storable} from '@layr/storable';

import type {Message as MessageType} from './backend';

(async () => {
  const client = new ComponentHTTPClient('http://localhost:3210', {
    mixins: [Storable]
  });

  const Message = (await client.getComponent()) as typeof MessageType;

  const text = process.argv[2];

  if (text) {
    addMessage(text);
  } else {
    showMessages();
  }

  async function addMessage(text: string) {
    const message = new Message({text});
    await message.save();
    console.log(`Message successfully added`);
  }

  async function showMessages() {
    const messages = await Message.find(
      {},
      {text: true, createdAt: true},
      {sort: {createdAt: 'desc'}, limit: 30}
    );

    for (const message of messages) {
      console.log(`[${message.createdAt.toISOString()}] ${message.text}`);
    }
  }
})();

import {ComponentHTTPClient} from '@layr/component-http-client';
import {Storable} from '@layr/storable';

import {extendApplication} from './components/application';

export default async () => {
  const client = new ComponentHTTPClient(process.env.BACKEND_URL, {
    mixins: [Storable],
    async retryFailedRequests() {
      return confirm('Sorry, a network error occurred. Would you like to retry?');
    }
  });

  const BackendApplicationProxy = await client.getComponent();

  const Application = extendApplication(BackendApplicationProxy);

  return Application;
};

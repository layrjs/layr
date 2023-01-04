import {ComponentHTTPClient} from '@layr/component-http-client';
import {Storable} from '@layr/storable';

import type {Application as BackendApplication} from '../../backend/src/components/application';
import {extendApplication} from './components/application';

export default async () => {
  const client = new ComponentHTTPClient(process.env.BACKEND_URL!, {
    mixins: [Storable],
    async retryFailedRequests() {
      return confirm('Sorry, a network error occurred. Would you like to retry?');
    }
  });

  const BackendApplicationProxy = (await client.getComponent()) as typeof BackendApplication;

  const Application = extendApplication(BackendApplicationProxy);

  return Application;
};

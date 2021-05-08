import {ComponentHTTPClient} from '@layr/component-http-client';
import {Storable} from '@layr/storable';
import ReactDOM from 'react-dom';
import {jsx} from '@emotion/core';

import type {Application as BackendApplication} from '../../backend/src/components/application';
import {createApplicationComponent} from './components/application';

const backendURL = process.env.BACKEND_URL;

if (!backendURL) {
  throw new Error(`'BACKEND_URL' environment variable is missing`);
}

(async () => {
  if (!(window as any).IS_SUPPORTED_BROWSER) {
    return;
  }

  let content;

  try {
    const client = new ComponentHTTPClient(backendURL, {
      mixins: [Storable],
      async retryFailedRequests() {
        return confirm('Sorry, a network error occurred. Would you like to retry?');
      }
    });

    const BackendApplicationProxy = (await client.getComponent()) as typeof BackendApplication;

    const Application = createApplicationComponent(BackendApplicationProxy);

    if (process.env.NODE_ENV !== 'production') {
      (window as any).Application = Application; // For debugging
    }

    await Application.Session.loadUser();

    content = <Application.RootView />;
  } catch (err) {
    console.error(err);

    content = <pre>{err.stack}</pre>;
  }

  ReactDOM.render(content, document.getElementById('root'));
})();

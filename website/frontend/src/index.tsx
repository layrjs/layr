import ReactDOM from 'react-dom';
import {jsx} from '@emotion/core';

import {getFrontend} from './components/frontend';

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
    const Frontend = await getFrontend({backendURL});

    if (process.env.NODE_ENV !== 'production') {
      (window as any).Frontend = Frontend; // For debugging
    }

    await Frontend.Session.loadUser();

    content = <Frontend.Root />;
  } catch (err) {
    console.error(err);

    content = <pre>{err.stack}</pre>;
  }

  ReactDOM.render(content, document.getElementById('root'));
})();

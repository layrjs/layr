import React from 'react';
import ReactDOM from 'react-dom';

import {createLayer} from './layer';

(async () => {
  if (!window.IS_SUPPORTED_BROWSER) {
    return;
  }

  let content;

  try {
    const layer = await createLayer();
    await layer.$open();

    if (process.env.NODE_ENV !== 'production') {
      window.$layer = layer; // For debugging
    }

    content = <layer.Root.Main />;
  } catch (err) {
    console.error(err);
    content = <pre>{err.stack}</pre>;
  }

  ReactDOM.render(content, document.getElementById('root'));
})();

import React from 'react';
import ReactDOM from 'react-dom';

import {createLayer} from './layer';

(async () => {
  let content;

  try {
    const layer = await createLayer();
    await layer.$open();
    const {Root} = layer;
    content = <Root.Main />;
  } catch (err) {
    console.error(err);
    content = <pre>{err.stack}</pre>;
  }

  ReactDOM.render(content, document.getElementById('root'));
})();

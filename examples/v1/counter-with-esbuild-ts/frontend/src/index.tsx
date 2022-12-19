import React from 'react';
import ReactDOM from 'react-dom';

import {getCounter} from './components/counter';

(async () => {
  const Counter = await getCounter();

  const counter = new Counter();

  ReactDOM.render(
    <React.StrictMode>
      <counter.Main />
    </React.StrictMode>,
    document.getElementById('root')
  );
})();

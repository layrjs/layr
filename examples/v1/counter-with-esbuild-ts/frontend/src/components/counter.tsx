import {ComponentHTTPClient} from '@layr/component-http-client';
import React from 'react';
import {view} from '@layr/react-integration';

import type {Counter as BackendCounter} from '../../../backend/src/components/counter';

export const getCounter = async () => {
  const client = new ComponentHTTPClient('http://localhost:3001');

  const BackendCounterProxy = (await client.getComponent()) as typeof BackendCounter;

  class Counter extends BackendCounterProxy {
    @view() Main() {
      return (
        <div>
          <input value={this.value} readOnly />
          <button
            onClick={async () => {
              await this.increment();
            }}
          >
            +
          </button>
        </div>
      );
    }
  }

  return Counter;
};

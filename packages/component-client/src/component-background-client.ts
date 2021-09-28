import type {ComponentServerLike} from '@layr/component-server';
import type {PlainObject} from 'core-helpers';

import {ComponentClient} from './component-client';

export class ComponentBackgroundClient extends ComponentClient {
  constructor(componentServer: ComponentServerLike) {
    const componentBackgroundServer = createComponentBackgroundServer(componentServer);

    super(componentBackgroundServer);
  }
}

function createComponentBackgroundServer(componentServer: ComponentServerLike) {
  return {
    receive(request: {query: PlainObject; components?: PlainObject[]; version?: number}): any {
      componentServer.receive(request, {executionMode: 'background'});

      return {};
    }
  };
}

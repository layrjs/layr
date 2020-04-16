import {isLayer} from '@liaison/layer';
import {Component, isComponentClass} from '@liaison/component';
import isEqual from 'lodash/isEqual';

import {LayerClient} from '../../..';

describe('LayerClient', () => {
  const server = {
    receiveQuery({query, version: clientVersion} = {}) {
      const serverVersion = 1;

      if (clientVersion !== serverVersion) {
        throw Object.assign(
          new Error(
            `The component client version (${clientVersion}) doesn't match the component server version (${serverVersion})`
          ),
          {code: 'COMPONENT_CLIENT_VERSION_DOES_NOT_MATCH_COMPONENT_SERVER_VERSION'}
        );
      }

      // client.getLayer()
      if (isEqual(query, {'introspect=>': {'()': []}})) {
        return {
          result: {
            name: 'backend',
            components: [
              {
                name: 'Movie',
                type: 'Component',
                properties: [
                  {
                    name: 'limit',
                    type: 'attribute',
                    value: 100,
                    exposure: {get: true}
                  }
                ]
              }
            ]
          }
        };
      }

      throw new Error(`Received an unknown query: ${JSON.stringify(query)}`);
    }
  };

  test('Getting components', async () => {
    let client = new LayerClient(server);

    expect(() => client.getLayer()).toThrow(
      "The component client version (undefined) doesn't match the component server version (1)"
    );

    client = new LayerClient(server, {
      version: 1,
      baseComponents: [Component]
    });

    const layer = client.getLayer();

    expect(isLayer(layer)).toBe(true);
    expect(layer.getName()).toBe('backend');

    const Movie = layer.getComponent('Movie');

    expect(isComponentClass(Movie)).toBe(true);
    expect(Movie.getComponentName()).toBe('Movie');
    expect(Movie.limit).toBe(100);

    const attribute = Movie.getAttribute('limit');

    expect(attribute.getValue()).toBe(100);
    expect(attribute.getExposure()).toEqual({get: true});
  });
});

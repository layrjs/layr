import {Component, attribute, expose} from '@liaison/component';
import {Layer} from '@liaison/layer';

import {LayerServer} from '../../..';

describe('LayerServer', () => {
  test('Introspecting layers', async () => {
    class Movie extends Component {
      @expose({get: true}) @attribute() static limit = 100;

      @expose({get: true, set: true}) @attribute() title = '';
    }

    class Cinema extends Component {
      @expose({get: true}) @attribute() movies;
    }

    const layer = new Layer([Movie, Cinema], {name: 'backend'});

    const server = new LayerServer(layer);

    const introspection = server.receiveQuery({'introspect=>': {'()': []}});

    expect(introspection).toStrictEqual({
      name: 'backend',
      components: [
        {
          name: 'Movie',
          type: 'Component',
          properties: [{name: 'limit', type: 'attribute', value: 100, exposure: {get: true}}],
          prototype: {
            properties: [
              {
                name: 'title',
                type: 'attribute',
                default: {__function: "function () {\n        return '';\n      }"},
                exposure: {get: true, set: true}
              }
            ]
          }
        },
        {
          name: 'Cinema',
          type: 'Component',
          prototype: {
            properties: [{name: 'movies', type: 'attribute', exposure: {get: true}}]
          }
        }
      ]
    });

    expect(() => server.receiveQuery({'introspect=>': {'()': []}}, {version: 1})).toThrow(
      "The component client version (1) doesn't match the component server version (undefined)"
    );
  });
});

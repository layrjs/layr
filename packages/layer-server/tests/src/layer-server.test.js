import {Component, attribute, expose} from '@liaison/component';
import {Layer} from '@liaison/layer';

import {LayerServer} from '../../..';

describe('LayerServer', () => {
  test('Introspecting layers', async () => {
    const provider = function() {
      class Movie extends Component {
        @expose({get: true}) @attribute() static limit = 100;

        @expose({get: true, set: true}) @attribute() title = '';
      }

      class Cinema extends Component {
        @expose({get: true}) @attribute() movies;
      }

      return new Layer([Movie, Cinema], {name: 'backend'});
    };

    const server = new LayerServer(provider);

    const introspection = server.receiveQuery({'introspect=>': {'()': []}});

    expect(introspection).toStrictEqual({
      name: 'backend',
      components: [
        {
          name: 'Movie',
          type: 'Component',
          properties: [{name: 'limit', type: 'attribute', value: 100, exposure: {get: true}}]
        },
        {
          name: 'movie',
          type: 'component',
          properties: [
            {
              name: 'title',
              type: 'attribute',
              default: {__function: "function () {\n          return '';\n        }"},
              exposure: {get: true, set: true}
            }
          ]
        },
        {
          name: 'cinema',
          type: 'component',
          properties: [{name: 'movies', type: 'attribute', exposure: {get: true}}]
        }
      ]
    });

    expect(() => server.receiveQuery({'introspect=>': {'()': []}}, {version: 1})).toThrow(
      "The component client version (1) doesn't match the component server version (undefined)"
    );
  });
});

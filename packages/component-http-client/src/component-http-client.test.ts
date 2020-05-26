import {isComponentClass} from '@liaison/component';
import Koa from 'koa';
import jsonError from 'koa-json-error';
import cors from '@koa/cors';
import body from 'co-body';
import type {Server} from 'http';
import isEqual from 'lodash/isEqual';

import {ComponentHTTPClient} from './component-http-client';

const SERVER_PORT = 4444;

describe('ComponentHTTPClient', () => {
  let server: Server | undefined;

  beforeAll(() => {
    const koa = new Koa();

    koa.use(jsonError());

    koa.use(cors({maxAge: 900})); // 15 minutes

    koa.use(async function (ctx) {
      const {query, version: clientVersion} = await body.json(ctx.req);

      const serverVersion = 1;

      if (clientVersion !== serverVersion) {
        throw Object.assign(
          new Error(
            `The component client version (${clientVersion}) doesn't match the component server version (${serverVersion})`
          ),
          {code: 'COMPONENT_CLIENT_VERSION_DOES_NOT_MATCH_COMPONENT_SERVER_VERSION', expose: true}
        );
      }

      if (isEqual(query, {'introspect=>': {'()': []}})) {
        ctx.body = {
          result: {
            component: {
              name: 'Movie',
              properties: [
                {
                  name: 'limit',
                  type: 'Attribute',
                  valueType: 'number',
                  value: 100,
                  exposure: {get: true}
                }
              ]
            }
          }
        };
      } else {
        throw new Error(`Received an unknown query: ${JSON.stringify(query)}`);
      }
    });

    return new Promise((resolve) => {
      server = koa.listen(SERVER_PORT, resolve);
    });
  });

  afterAll(() => {
    if (server === undefined) {
      return;
    }

    return new Promise((resolve) => {
      server!.close(() => {
        server = undefined;
        resolve();
      });
    });
  });

  test('Getting components', async () => {
    let client = new ComponentHTTPClient(`http://localhost:${SERVER_PORT}`);

    await expect(client.getComponent()).rejects.toThrow(
      "The component client version (undefined) doesn't match the component server version (1)"
    );

    client = new ComponentHTTPClient(`http://localhost:${SERVER_PORT}`, {version: 1});

    const Movie = await client.getComponent();

    expect(isComponentClass(Movie)).toBe(true);
    expect(Movie.getComponentName()).toBe('Movie');

    const attribute = Movie.getAttribute('limit');

    expect(attribute.getValue()).toBe(100);
    expect(attribute.getExposure()).toEqual({get: true});
  });
});

import fetch from 'cross-fetch';
import {hasOwnProperty} from 'core-helpers';
import nanoid from 'nanoid';
import debugModule from 'debug';

const debug = debugModule('liaison:layer-http-client');
// To display the debug log, set this environment:
// DEBUG=liaison:layer-http-client DEBUG_DEPTH=10

export class LayerHTTPClient {
  constructor(url) {
    if (!url) {
      throw new Error(`'url' parameter is missing`);
    }

    this._url = url;
  }

  async getLayer() {
    let layer = this._layer;

    if (layer === undefined) {
      const url = this._url;

      debug(`Introspecting the remote layer (URL: '${url}')`);
      const response = await fetch(url); // Introspect remote layer
      if (response.status !== 200) {
        throw new Error('An error occurred while introspecting the remote layer');
      }
      const introspection = await response.json();
      if (introspection.name === undefined) {
        introspection.name = nanoid(10);
      }
      debug(`Remote layer introspected (URL: '${url}')`);

      layer = {
        getName() {
          return introspection.name;
        },

        get(name, {throwIfNotFound = true} = {}) {
          if (
            !(hasOwnProperty(introspection, 'items') && hasOwnProperty(introspection.items, name))
          ) {
            if (throwIfNotFound) {
              throw new Error(`Item not found in the layer proxy (name: '${name}')`);
            }
            return undefined;
          }

          const item = introspection.items[name];

          const _isExposed = function (target) {
            if (target === undefined) {
              return undefined;
            }

            return hasOwnProperty(target, 'properties');
          };

          const _getPropertyExposition = function (target, name) {
            if (!_isExposed(target)) {
              return undefined;
            }

            const properties = target.properties;

            if (!hasOwnProperty(properties, name)) {
              return undefined;
            }

            return properties[name].exposition;
          };

          const itemMock = {
            __isRegisterableMock: true,

            $isExposed() {
              return _isExposed(item);
            },

            $getPropertyExposition(name) {
              return _getPropertyExposition(item, name);
            },

            ...(item.prototype && {
              prototype: {
                __isRegisterableMock: true,

                $isExposed() {
                  return _isExposed(item.prototype);
                },

                $getPropertyExposition(name) {
                  return _getPropertyExposition(item.prototype, name);
                }
              }
            })
          };

          return itemMock;
        },

        async receiveQuery({query, items, source} = {}) {
          debug(
            `Sending a query to the remote layer (URL: '${url}', query: ${JSON.stringify(
              query
            )}), items: ${JSON.stringify(items)})`
          );

          const fetchResponse = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({query, items, source})
          });

          if (fetchResponse.status !== 200) {
            throw new Error('An error occurred while sending a query to the remote layer');
          }

          const response = await fetchResponse.json();

          debug(
            `Query sent to the remote layer (URL: '${url}'), response: ${JSON.stringify(response)}`
          );

          if (response.error) {
            const {message, ...otherAttributes} = response.error;
            throw Object.assign(new Error(message), otherAttributes);
          }

          return response.result;
        }
      };

      this._layer = layer;
    }

    return layer;
  }
}

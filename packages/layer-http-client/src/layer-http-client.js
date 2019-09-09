import fetch from 'cross-fetch';
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

  async connect() {
    debug(`Connecting to layer server (URL: '${this._url}')`);

    const response = await fetch(this._url); // Introspect remote layer

    if (response.status !== 200) {
      throw new Error('An error occurred while connecting to the layer server');
    }

    this._introspection = await response.json();

    debug(`Layer server connected (URL: '${this._url}')`);

    return this.getProxy();
  }

  getProxy() {
    if (this._proxy === undefined) {
      const url = this._url;
      const introspection = this._introspection;

      if (introspection === undefined) {
        throw new Error('Layer server has not been connected');
      }

      this._proxy = {
        getId() {
          return introspection.id;
        },

        getName() {
          return introspection.name;
        },

        get(name, {throwIfNotFound = true} = {}) {
          if (!Object.prototype.hasOwnProperty.call(introspection.items, name)) {
            if (throwIfNotFound) {
              throw new Error(`Item not found in the layer proxy (name: '${name}')`);
            }
            return undefined;
          }

          const properties = introspection.items[name];

          const _getExposedProperty = function (target, name) {
            if (!Object.prototype.hasOwnProperty.call(target, name)) {
              return undefined;
            }
            const {_type: type} = target[name];
            return {name, type};
          };

          const itemProxy = {
            _isExposed: true,

            getExposedProperty(name) {
              return _getExposedProperty(properties, name);
            },

            ...(properties.prototype && {
              prototype: {
                getExposedProperty(name) {
                  return _getExposedProperty(properties.prototype, name);
                }
              }
            })
          };

          return itemProxy;
        },

        async receiveQuery({query, items, source} = {}) {
          debug(
            `Sending query to layer server (URL: '${url}', query: ${JSON.stringify(
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
            throw new Error('An error occurred while sending a query to the layer server');
          }

          const response = await fetchResponse.json();

          debug(
            `Query sent to layer server (URL: '${url}'), response: ${JSON.stringify(response)}`
          );

          if (response.error) {
            throw new Error(response.error.message);
          }

          return response.result;
        }
      };
    }

    return this._proxy;
  }
}

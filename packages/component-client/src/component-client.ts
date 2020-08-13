import {
  Component,
  ComponentSet,
  ComponentGetter,
  Attribute,
  serialize,
  deserialize,
  ensureComponentClass,
  ComponentMixin,
  assertIsComponentMixin
} from '@liaison/component';
import type {ComponentServerLike} from '@liaison/component-server';
import {Microbatcher, Invocation} from 'microbatcher';
import {getTypeOf, PlainObject} from 'core-helpers';
import {possiblyAsync} from 'possibly-async';
import debugModule from 'debug';

const debug = debugModule('liaison:component-client');
// To display the debug log, set this environment:
// DEBUG=liaison:component-client DEBUG_DEPTH=5

import {isComponentClientInstance} from './utilities';

interface SendInvocation extends Invocation {
  operation: 'send';
  params: Parameters<ComponentClient['_sendOne']>;
  resolve: (value: ReturnType<ComponentClient['_sendOne']>) => void;
}

export type ComponentClientOptions = {
  version?: number;
  mixins?: ComponentMixin[];
  batchable?: boolean;
};

/**
 * A base class allowing to access a root [`Component`](https://liaison.dev/docs/v1/reference/component) that is served by a [`ComponentServer`](https://liaison.dev/docs/v1/reference/component-server).
 *
 * Typically, instead of using this class, you would use a subclass such as [`ComponentHTTPClient`](https://liaison.dev/docs/v1/reference/component-http-client).
 */
export class ComponentClient {
  _componentServer: ComponentServerLike;
  _version: number | undefined;
  _mixins: ComponentMixin[] | undefined;
  _sendBatcher: Microbatcher<SendInvocation> | undefined;

  /**
   * Creates a component client.
   *
   * @param componentServer The [`ComponentServer`](https://liaison.dev/docs/v1/reference/component-server) to connect to.
   * @param [options.version] A number specifying the expected version of the component server (default: `undefined`). If a version is specified, an error is thrown when a request is sent and the component server has a different version. The thrown error is a JavaScript `Error` instance with a `code` attribute set to `'COMPONENT_CLIENT_VERSION_DOES_NOT_MATCH_COMPONENT_SERVER_VERSION'`.
   * @param [options.mixins] An array of the component mixins (e.g., [`Storable`](https://liaison.dev/docs/v1/reference/storable)) to use when constructing the components exposed by the component server (default: `[]`).
   *
   * @returns A `ComponentClient` instance.
   *
   * @example
   * ```
   * // JS
   *
   * import {Component, attribute, expose} from '﹫liaison/component';
   * import {ComponentClient} from '﹫liaison/component-client';
   * import {ComponentServer} from '﹫liaison/component-server';
   *
   * class Movie extends Component {
   *   ﹫expose({get: true, set: true}) ﹫attribute('string') title;
   * }
   *
   * const server = new ComponentServer(Movie);
   * const client = new ComponentClient(server);
   *
   * const RemoteMovie = client.getComponent();
   * ```
   *
   * @example
   * ```
   * // TS
   *
   * import {Component, attribute, expose} from '﹫liaison/component';
   * import {ComponentClient} from '﹫liaison/component-client';
   * import {ComponentServer} from '﹫liaison/component-server';
   *
   * class Movie extends Component {
   *   ﹫expose({get: true, set: true}) ﹫attribute('string') title!: string;
   * }
   *
   * const server = new ComponentServer(Movie);
   * const client = new ComponentClient(server);
   *
   * const RemoteMovie = client.getComponent() as typeof Movie;
   * ```
   *
   * @category Creation
   */
  constructor(componentServer: ComponentServerLike, options: ComponentClientOptions = {}) {
    const {version, mixins, batchable = false} = options;

    if (typeof componentServer?.receive !== 'function') {
      throw new Error(
        `Expected a component server, but received a value of type '${getTypeOf(componentServer)}'`
      );
    }

    if (mixins !== undefined) {
      for (const mixin of mixins) {
        assertIsComponentMixin(mixin);
      }
    }

    this._componentServer = componentServer;
    this._version = version;
    this._mixins = mixins;

    if (batchable) {
      this._sendBatcher = new Microbatcher(this._sendMany.bind(this));
    }
  }

  _component!: typeof Component;

  /**
   * Gets the component that is served by the component server.
   *
   * @returns A [`Component`](https://liaison.dev/docs/v1/reference/component) class.
   *
   * @examplelink See [`constructor`'s example](https://liaison.dev/docs/v1/reference/component-client#constructor).
   *
   * @category Getting the served component
   * @possiblyasync
   */
  getComponent() {
    if (this._component === undefined) {
      return possiblyAsync(this._createComponent(), (component) => {
        this._component = component;
        return component;
      });
    }

    return this._component;
  }

  _createComponent() {
    return possiblyAsync(this._introspectComponentServer(), (introspectedComponentServer) => {
      const methodBuilder = (name: string) => this._createMethodProxy(name);

      return Component.unintrospect(introspectedComponentServer.component, {
        mixins: this._mixins,
        methodBuilder
      });
    });
  }

  _createMethodProxy(name: string) {
    const componentClient = this;

    return function (this: typeof Component | Component, ...args: any[]) {
      const query = {
        '<=': this,
        [`${name}=>`]: {'()': args}
      };

      const componentClass = ensureComponentClass(this);

      const componentGetter = (type: string) => {
        return componentClass.getComponentOfType(type);
      };

      return componentClient.send(query, {componentGetter});
    };
  }

  _introspectedComponentServer!: PlainObject;

  _introspectComponentServer() {
    if (this._introspectedComponentServer === undefined) {
      const query = {'introspect=>': {'()': []}};

      return possiblyAsync(this.send(query), (introspectedComponentServer) => {
        this._introspectedComponentServer = introspectedComponentServer;
        return introspectedComponentServer;
      });
    }

    return this._introspectedComponentServer;
  }

  send(query: PlainObject, options: {componentGetter?: ComponentGetter} = {}): any {
    if (this._sendBatcher !== undefined) {
      return this._sendBatcher.batch('send', query, options);
    }

    return this._sendOne(query, options);
  }

  _sendOne(query: PlainObject, options: {componentGetter?: ComponentGetter}): any {
    const {serializedQuery, serializedComponents} = this._serializeQuery(query);

    debugRequest({serializedQuery, serializedComponents});

    return possiblyAsync(
      this._componentServer.receive({
        query: serializedQuery,
        ...(serializedComponents && {components: serializedComponents}),
        version: this._version
      }),
      ({result: serializedResult, components: serializedComponents}) => {
        debugResponse({serializedResult, serializedComponents});

        const {componentGetter} = options;

        const errorHandler = function (error: Error) {
          throw error;
        };

        return possiblyAsync(
          deserialize(serializedComponents, {
            componentGetter,
            deserializeFunctions: true,
            errorHandler,
            source: 1
          }),
          () => {
            return deserialize(serializedResult, {
              componentGetter,
              deserializeFunctions: true,
              errorHandler,
              source: 1
            });
          }
        );
      }
    );
  }

  async _sendMany(invocations: SendInvocation[]) {
    if (invocations.length === 1) {
      const invocation = invocations[0];

      try {
        invocation.resolve(await this._sendOne(...invocation.params));
      } catch (error) {
        invocation.reject(error);
      }

      return;
    }

    const queries = invocations.map(({params: [query]}) => query);

    const {serializedQuery, serializedComponents} = this._serializeQuery(queries);

    debugRequests({serializedQuery, serializedComponents});

    const serializedResponse = await this._componentServer.receive({
      query: serializedQuery,
      ...(serializedComponents && {components: serializedComponents}),
      version: this._version
    });

    debugResponses({
      serializedResult: serializedResponse.result,
      serializedComponents: serializedResponse.components
    });

    const errorHandler = function (error: Error) {
      throw error;
    };

    const firstComponentGetter = invocations[0].params[1].componentGetter;

    await deserialize(serializedResponse.components, {
      componentGetter: firstComponentGetter,
      deserializeFunctions: true,
      errorHandler,
      source: 1
    });

    for (let index = 0; index < invocations.length; index++) {
      const invocation = invocations[index];
      const serializedResult = (serializedResponse.result as unknown[])[index];

      try {
        const result = await deserialize(serializedResult, {
          componentGetter: invocation.params[1].componentGetter,
          deserializeFunctions: true,
          errorHandler,
          source: 1
        });

        invocation.resolve(result);
      } catch (error) {
        invocation.reject(error);
      }
    }
  }

  _serializeQuery(query: PlainObject) {
    const componentDependencies: ComponentSet = new Set();

    const attributeFilter = function (this: typeof Component | Component, attribute: Attribute) {
      // Exclude properties that cannot be set in the remote components

      const remoteComponent = this.getRemoteComponent();

      if (remoteComponent === undefined) {
        return false;
      }

      const attributeName = attribute.getName();
      const remoteAttribute = remoteComponent.hasAttribute(attributeName)
        ? remoteComponent.getAttribute(attributeName)
        : undefined;

      if (remoteAttribute === undefined) {
        return false;
      }

      return remoteAttribute.operationIsAllowed('set') as boolean;
    };

    const serializedQuery: PlainObject = serialize(query, {
      componentDependencies,
      attributeFilter,
      target: 1
    });

    let serializedComponentDependencies: PlainObject[] | undefined;
    const handledComponentDependencies: ComponentSet = new Set();

    const serializeComponentDependencies = function (componentDependencies: ComponentSet) {
      if (componentDependencies.size === 0) {
        return;
      }

      const additionalComponentDependency: ComponentSet = new Set();

      for (const componentDependency of componentDependencies.values()) {
        if (handledComponentDependencies.has(componentDependency)) {
          continue;
        }

        const serializedComponentDependency = componentDependency.serialize({
          componentDependencies: additionalComponentDependency,
          ignoreEmptyComponents: true,
          attributeFilter,
          target: 1
        });

        if (serializedComponentDependency !== undefined) {
          if (serializedComponentDependencies === undefined) {
            serializedComponentDependencies = [];
          }

          serializedComponentDependencies.push(serializedComponentDependency);
        }

        handledComponentDependencies.add(componentDependency);
      }

      serializeComponentDependencies(additionalComponentDependency);
    };

    serializeComponentDependencies(componentDependencies);

    return {serializedQuery, serializedComponents: serializedComponentDependencies};
  }

  static isComponentClient(value: any): value is ComponentClient {
    return isComponentClientInstance(value);
  }
}

function debugRequest({
  serializedQuery,
  serializedComponents
}: {
  serializedQuery: PlainObject;
  serializedComponents: PlainObject[] | undefined;
}) {
  let message = 'Sending query: %o';
  const values = [serializedQuery];

  if (serializedComponents !== undefined) {
    message += ' (components: %o)';
    values.push(serializedComponents);
  }

  debug(message, ...values);
}

function debugResponse({
  serializedResult,
  serializedComponents
}: {
  serializedResult: unknown;
  serializedComponents: PlainObject[] | undefined;
}) {
  let message = 'Result received: %o';
  const values = [serializedResult];

  if (serializedComponents !== undefined) {
    message += ' (components: %o)';
    values.push(serializedComponents);
  }

  debug(message, ...values);
}

function debugRequests({
  serializedQuery,
  serializedComponents
}: {
  serializedQuery: PlainObject;
  serializedComponents: PlainObject[] | undefined;
}) {
  let message = 'Sending queries: %o';
  const values = [serializedQuery];

  if (serializedComponents !== undefined) {
    message += ' (components: %o)';
    values.push(serializedComponents);
  }

  debug(message, ...values);
}

function debugResponses({
  serializedResult,
  serializedComponents
}: {
  serializedResult: unknown;
  serializedComponents: PlainObject[] | undefined;
}) {
  let message = 'Results received: %o';
  const values = [serializedResult];

  if (serializedComponents !== undefined) {
    message += ' (components: %o)';
    values.push(serializedComponents);
  }

  debug(message, ...values);
}

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

export class ComponentClient {
  _componentServer: ComponentServerLike;
  _version: number | undefined;
  _mixins: ComponentMixin[] | undefined;
  _sendBatcher: Microbatcher<SendInvocation> | undefined;

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

    debug(
      `Sending query to remote components (query: %o, components: %o)`,
      serializedQuery,
      serializedComponents
    );

    return possiblyAsync(
      this._componentServer.receive({
        query: serializedQuery,
        ...(serializedComponents && {components: serializedComponents}),
        version: this._version
      }),
      ({result: serializedResult, components: serializedComponents}) => {
        debug(
          `Query sent to remote components (result: %o, components: %o)`,
          serializedResult,
          serializedComponents
        );

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

    debug(
      `Sending queries to remote components (queries: %o, components: %o)`,
      serializedQuery,
      serializedComponents
    );

    const serializedResponse = await this._componentServer.receive({
      query: serializedQuery,
      ...(serializedComponents && {components: serializedComponents}),
      version: this._version
    });

    debug(
      `Queries sent to remote components (results: %o, components: %o)`,
      serializedResponse.result,
      serializedResponse.components
    );

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

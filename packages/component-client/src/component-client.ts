import {
  Component,
  ComponentSet,
  ComponentGetter,
  Attribute,
  PropertyFilterSync,
  serialize,
  deserialize,
  ensureComponentClass,
  ComponentMixin,
  assertIsComponentMixin
} from '@liaison/component';
import type {ComponentServerLike} from '@liaison/component-server';
import {getTypeOf, PlainObject} from 'core-helpers';
import {possiblyAsync} from 'possibly-async';
import debugModule from 'debug';

const debug = debugModule('liaison:component-client');
// To display the debug log, set this environment:
// DEBUG=liaison:component-client DEBUG_DEPTH=5

import {isComponentClientInstance} from './utilities';

export type ComponentClientOptions = {
  version?: number;
  mixins?: ComponentMixin[];
};

export class ComponentClient {
  _componentServer: ComponentServerLike;
  _version: number | undefined;
  _mixins: ComponentMixin[] | undefined;

  constructor(componentServer: ComponentServerLike, options: ComponentClientOptions = {}) {
    const {version, mixins} = options;

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

      return componentClient.send({query}, {componentGetter});
    };
  }

  _introspectedComponentServer!: PlainObject;

  _introspectComponentServer() {
    if (this._introspectedComponentServer === undefined) {
      const query = {'introspect=>': {'()': []}};

      return possiblyAsync(this.send({query}), (introspectedComponentServer) => {
        this._introspectedComponentServer = introspectedComponentServer;
        return introspectedComponentServer;
      });
    }

    return this._introspectedComponentServer;
  }

  send(
    request: {query: PlainObject; components?: (typeof Component | Component)[]},
    options: {componentGetter?: ComponentGetter} = {}
  ) {
    const {componentGetter} = options;

    const componentServer = this._componentServer;
    const version = this._version;

    const attributeFilter = function (this: typeof Component | Component, attribute: Attribute) {
      // Exclude properties that cannot be set in the remote components

      const remoteComponent = this.getRemoteComponent()!;
      const attributeName = attribute.getName();
      const remoteAttribute = remoteComponent.hasAttribute(attributeName)
        ? remoteComponent.getAttribute(attributeName)
        : undefined;

      if (remoteAttribute !== undefined) {
        return remoteAttribute.operationIsAllowed('set') as boolean;
      }

      return false;
    };

    const errorHandler = function (error: Error) {
      throw error;
    };

    const {serializedQuery, serializedComponents} = this._serializeRequest(request, {
      attributeFilter
    });

    debug(
      `Sending query to remote components (query: %o, components: %o)`,
      serializedQuery,
      serializedComponents
    );

    return possiblyAsync(
      componentServer.receive({
        query: serializedQuery,
        ...(serializedComponents && {components: serializedComponents}),
        version
      }),
      ({result, components}) => {
        debug(`Query sent to remote components (result: %o, components: %o)`, result, components);

        return this._deserializeResponse({result, components}, {componentGetter, errorHandler});
      }
    );
  }

  _serializeRequest(
    {query, components}: {query: PlainObject; components?: (typeof Component | Component)[]},
    {attributeFilter}: {attributeFilter: PropertyFilterSync}
  ) {
    const componentDependencies = new Set(components);

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

  _deserializeResponse(
    response: {result: any; components: PlainObject[] | undefined},
    {
      componentGetter,
      errorHandler
    }: {componentGetter: ComponentGetter | undefined; errorHandler: (error: Error) => unknown}
  ) {
    const {result: serializedResult, components: serializedComponents} = response;

    deserialize(serializedComponents, {
      componentGetter,
      deserializeFunctions: true,
      errorHandler,
      source: 1
    });

    return deserialize(serializedResult, {
      componentGetter,
      deserializeFunctions: true,
      errorHandler,
      source: 1
    });
  }

  static isComponentClient(value: any): value is ComponentClient {
    return isComponentClientInstance(value);
  }
}

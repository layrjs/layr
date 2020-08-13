import {
  Component,
  ComponentSet,
  IntrospectedComponent,
  ComponentGetter,
  PropertyFilter,
  Attribute,
  PropertyOperation,
  isComponentClassOrInstance,
  assertIsComponentClass,
  serialize,
  deserialize
} from '@liaison/component';
import {invokeQuery} from '@deepr/runtime';
import {possiblyAsync} from 'possibly-async';
import {PlainObject} from 'core-helpers';
import debugModule from 'debug';

// To display the debug log, set this environment:
// DEBUG=liaison:component-server DEBUG_DEPTH=5
const debug = debugModule('liaison:component-server');

// To display errors occurring while invoking queries, set this environment:
// DEBUG=liaison:component-server:error DEBUG_DEPTH=5
const debugError = debugModule('liaison:component-server:error');

import {isComponentServerInstance} from './utilities';

export interface ComponentServerLike {
  receive: ComponentServer['receive'];
}

export type ComponentServerOptions = {
  name?: string;
  version?: number;
};

/**
 * A base class allowing to serve a [`Component`](https://liaison.dev/docs/v1/reference/component) so it can be accessed by a [`ComponentClient`](https://liaison.dev/docs/v1/reference/component-client).
 *
 * Typically, instead of using this class, you would use a class such as [`ComponentHTTPServer`](https://liaison.dev/docs/v1/reference/component-http-server), or a middleware such as [`component-koa-middleware`](https://liaison.dev/docs/v1/reference/component-koa-middleware).
 */
export class ComponentServer {
  _component: typeof Component;
  _introspectedComponent: IntrospectedComponent;
  _name: string | undefined;
  _version: number | undefined;

  /**
   * Creates a component server.
   *
   * @param component The [`Component`](https://liaison.dev/docs/v1/reference/component) class to serve.
   * @param [options.version] A number representing the version of the created component server (default: `undefined`).
   *
   * @returns A `ComponentServer` instance.
   *
   * @examplelink See [`ComponentClient`'s example](https://liaison.dev/docs/v1/reference/component-client#constructor).
   *
   * @category Creation
   */
  constructor(component: typeof Component, options: ComponentServerOptions = {}) {
    const {name, version} = options;

    assertIsComponentClass(component);

    const introspectedComponent = component.introspect();

    if (introspectedComponent === undefined) {
      throw new Error(
        `Cannot serve a component that has no exposed properties or doesn't provide any exposed components (${component.describeComponent()})`
      );
    }

    this._component = component;
    this._introspectedComponent = introspectedComponent;
    this._name = name;
    this._version = version;
  }

  receive(request: {query: PlainObject; components?: PlainObject[]; version?: number}) {
    const {
      query: serializedQuery,
      components: serializedComponents,
      version: clientVersion
    } = request;

    this.validateVersion(clientVersion);

    const forkedComponent = this._component.fork();
    const deeprRoot = this.getDeeprRoot();

    const componentGetter = (type: string) => forkedComponent.getComponentOfType(type);

    const getFilter = function (attribute: Attribute) {
      return attribute.operationIsAllowed('get');
    };

    const setFilter = function (attribute: Attribute) {
      return attribute.operationIsAllowed('set');
    };

    const authorizer = function (this: any, name: string, operation: string, _params?: any[]) {
      if (this === deeprRoot && name === 'introspect' && operation === 'call') {
        return true;
      }

      if (isComponentClassOrInstance(this)) {
        const property = this.hasProperty(name) ? this.getProperty(name) : undefined;

        if (property !== undefined) {
          return property.operationIsAllowed(operation as PropertyOperation);
        }
      }

      return false;
    };

    const errorHandler = function (error: Error) {
      debugError(
        `An error occurred while invoking a query (query: %o, components: %o)\n%s`,
        serializedQuery,
        serializedComponents,
        error.stack
      );
      return error;
    };

    debugRequest({serializedQuery, serializedComponents});

    return possiblyAsync(
      this._deserializeRequest(
        {serializedQuery, serializedComponents},
        {componentGetter, attributeFilter: setFilter}
      ),
      ({deserializedQuery, deserializedComponents}) =>
        possiblyAsync(
          invokeQuery(deeprRoot, deserializedQuery, {authorizer, errorHandler}),
          (result) =>
            possiblyAsync(
              this._serializeResponse(
                {result, components: deserializedComponents},
                {attributeFilter: getFilter}
              ),
              ({serializedResult, serializedComponents}) => {
                debugResponse({serializedResult, serializedComponents});

                return {
                  ...(serializedResult !== undefined && {result: serializedResult}),
                  ...(serializedComponents !== undefined && {components: serializedComponents})
                };
              }
            )
        )
    );
  }

  _deserializeRequest(
    {
      serializedQuery,
      serializedComponents
    }: {serializedQuery: PlainObject; serializedComponents: PlainObject[] | undefined},
    {
      componentGetter,
      attributeFilter
    }: {componentGetter: ComponentGetter; attributeFilter: PropertyFilter}
  ) {
    return possiblyAsync(
      deserialize(serializedComponents, {
        componentGetter,
        attributeFilter,
        source: -1
      }),
      (deserializedComponents: (typeof Component | Component)[] | undefined) => {
        const deserializedComponentSet: ComponentSet = new Set(deserializedComponents);
        return possiblyAsync(
          deserialize(serializedQuery, {
            componentGetter,
            attributeFilter,
            deserializedComponents: deserializedComponentSet,
            source: -1
          }),
          (deserializedQuery: PlainObject) => {
            deserializedComponents = Array.from(deserializedComponentSet);
            return {deserializedQuery, deserializedComponents};
          }
        );
      }
    );
  }

  _serializeResponse(
    {
      result,
      components
    }: {result: unknown; components: (typeof Component | Component)[] | undefined},
    {attributeFilter}: {attributeFilter: PropertyFilter}
  ) {
    const serializedComponents: ComponentSet = new Set();
    const componentDependencies: ComponentSet = new Set(components);
    const serializedResult =
      result !== undefined
        ? serialize(result, {
            attributeFilter,
            serializedComponents,
            componentDependencies,
            serializeFunctions: true,
            target: -1
          })
        : undefined;

    let serializedComponentDependencies: PlainObject[] | undefined;
    const handledComponentDependencies = new Set(serializedComponents);

    const serializeComponentDependencies = function (
      componentDependencies: ComponentSet
    ): void | PromiseLike<void> {
      if (componentDependencies.size === 0) {
        return;
      }

      const additionalComponentDependencies: ComponentSet = new Set();

      return possiblyAsync(
        possiblyAsync.forEach(
          componentDependencies.values(),
          (componentDependency: typeof Component | Component) => {
            if (handledComponentDependencies.has(componentDependency)) {
              return;
            }

            return possiblyAsync(
              componentDependency.serialize({
                attributeFilter,
                componentDependencies: additionalComponentDependencies,
                ignoreEmptyComponents: true,
                serializeFunctions: true,
                target: -1
              }),
              (serializedComponentDependency) => {
                if (serializedComponentDependency !== undefined) {
                  if (serializedComponentDependencies === undefined) {
                    serializedComponentDependencies = [];
                  }

                  serializedComponentDependencies.push(serializedComponentDependency);
                }

                handledComponentDependencies.add(componentDependency);
              }
            );
          }
        ),
        () => serializeComponentDependencies(additionalComponentDependencies)
      );
    };

    return possiblyAsync(serializeComponentDependencies(componentDependencies), () => ({
      serializedResult,
      serializedComponents: serializedComponentDependencies
    }));
  }

  validateVersion(clientVersion: number | undefined) {
    const serverVersion = this._version;

    if (clientVersion !== serverVersion) {
      throw Object.assign(
        new Error(
          `The component client version (${clientVersion}) doesn't match the component server version (${serverVersion})`
        ),
        {code: 'COMPONENT_CLIENT_VERSION_DOES_NOT_MATCH_COMPONENT_SERVER_VERSION', expose: true}
      );
    }
  }

  _deeprRoot!: PlainObject;

  getDeeprRoot() {
    if (this._deeprRoot === undefined) {
      this._deeprRoot = Object.create(null);

      this._deeprRoot.introspect = () => ({
        ...(this._name !== undefined && {name: this._name}),
        component: this._introspectedComponent
      });
    }

    return this._deeprRoot;
  }

  static isComponentServer(value: any): value is ComponentServer {
    return isComponentServerInstance(value);
  }
}

export function ensureComponentServer(
  componentOrComponentServer: typeof Component | ComponentServer,
  options: ComponentServerOptions = {}
): ComponentServer {
  if (isComponentServerInstance(componentOrComponentServer)) {
    return componentOrComponentServer;
  }

  return new ComponentServer(componentOrComponentServer, options);
}

function debugRequest({
  serializedQuery,
  serializedComponents
}: {
  serializedQuery: PlainObject;
  serializedComponents: PlainObject[] | undefined;
}) {
  let message = 'Receiving query: %o';
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
  let message = 'Returning result: %o';
  const values = [serializedResult];

  if (serializedComponents !== undefined) {
    message += ' (components: %o)';
    values.push(serializedComponents);
  }

  debug(message, ...values);
}

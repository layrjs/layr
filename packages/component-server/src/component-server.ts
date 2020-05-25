import {
  Component,
  IntrospectedComponent,
  ComponentGetter,
  PropertyFilter,
  ReferencedComponentSet,
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

const debug = debugModule('liaison:component-server');
// To display the debug log, set this environment:
// DEBUG=liaison:component-server DEBUG_DEPTH=5

import {isComponentServerInstance} from './utilities';

export interface ComponentServerLike {
  receive: ComponentServer['receive'];
}

type ComponentServerOptions = {
  name?: string;
  version?: number;
};

export class ComponentServer {
  _component: typeof Component;
  _introspectedComponent: IntrospectedComponent;
  _name: string | undefined;
  _version: number | undefined;

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

    const authorizer = function (
      this: any,
      name: string,
      operation: PropertyOperation,
      _params: any[]
    ) {
      if (this === deeprRoot && name === 'introspect' && operation === 'call') {
        return true;
      }

      if (isComponentClassOrInstance(this)) {
        const property = this.hasProperty(name) ? this.getProperty(name) : undefined;

        if (property !== undefined) {
          return property.operationIsAllowed(operation);
        }
      }

      return false;
    };

    const errorHandler = function (error: Error) {
      return error;
    };

    debug(
      `Receiving query from component client (query: %o, components: %o)`,
      serializedQuery,
      serializedComponents
    );

    return possiblyAsync(
      this._deserializeRequest(
        {serializedQuery, serializedComponents},
        {componentGetter, attributeFilter: setFilter}
      ),
      ({
        deserializedQuery,
        deserializedComponents
      }: {
        deserializedQuery: PlainObject;
        deserializedComponents: (typeof Component | Component)[] | undefined;
      }) =>
        possiblyAsync(
          invokeQuery(deeprRoot, deserializedQuery, {authorizer, errorHandler}),
          (result) =>
            possiblyAsync(
              this._serializeResponse(
                {result, components: deserializedComponents},
                {attributeFilter: getFilter}
              ),
              ({serializedResult, serializedComponents}) => {
                debug(
                  `Query received from component client (result: %o, components: %o)`,
                  serializedResult,
                  serializedComponents
                );

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
      (deserializedComponents) =>
        possiblyAsync(
          deserialize(serializedQuery, {
            componentGetter,
            attributeFilter,
            source: -1
          }),
          (deserializedQuery) => ({
            deserializedQuery,
            deserializedComponents
          })
        )
    );
  }

  _serializeResponse(
    {result, components}: {result: any; components: (typeof Component | Component)[] | undefined},
    {attributeFilter}: {attributeFilter: PropertyFilter}
  ) {
    const referencedComponents: ReferencedComponentSet = new Set(components);

    const serializedResult =
      result !== undefined
        ? serialize(result, {
            returnComponentReferences: true,
            referencedComponents,
            attributeFilter,
            serializeFunctions: true,
            target: -1
          })
        : undefined;

    let serializedComponents: PlainObject[] | undefined;
    const handledReferencedComponents: ReferencedComponentSet = new Set();

    const serializeReferencedComponents = function (
      referencedComponents: ReferencedComponentSet
    ): void | PromiseLike<void> {
      if (referencedComponents.size === 0) {
        return;
      }

      const additionalReferencedComponents: ReferencedComponentSet = new Set();

      return possiblyAsync(
        possiblyAsync.forEach(
          referencedComponents.values(),
          (referencedComponent: typeof Component | Component) => {
            if (handledReferencedComponents.has(referencedComponent)) {
              return;
            }

            return possiblyAsync(
              referencedComponent.serialize({
                referencedComponents: additionalReferencedComponents,
                ignoreEmptyComponents: true,
                attributeFilter,
                serializeFunctions: true,
                target: -1
              }),
              (serializedComponent) => {
                if (serializedComponent !== undefined) {
                  if (serializedComponents === undefined) {
                    serializedComponents = [];
                  }

                  serializedComponents.push(serializedComponent);
                }

                handledReferencedComponents.add(referencedComponent);
              }
            );
          }
        ),
        () => serializeReferencedComponents(additionalReferencedComponents)
      );
    };

    return possiblyAsync(serializeReferencedComponents(referencedComponents), () => ({
      serializedResult,
      serializedComponents
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

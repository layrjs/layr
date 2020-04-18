import {
  validateIsComponentClass,
  validateComponentName,
  createComponentMap,
  serialize,
  deserialize,
  getTypeOf
} from '@liaison/component';
import {hasOwnProperty, getClassOf} from 'core-helpers';
import {possiblyAsync} from 'possibly-async';
import debugModule from 'debug';
import ow from 'ow';

const debug = debugModule('liaison:component-client');
// To display the debug log, set this environment:
// DEBUG=liaison:component-client DEBUG_DEPTH=10

import {isComponentClient} from './utilities';

export class ComponentClient {
  constructor(componentServer, options = {}) {
    if (typeof componentServer?.receive !== 'function') {
      throw new Error(
        `Expected a component server, but received a value of type '${getTypeOf(componentServer)}'`
      );
    }

    ow(
      options,
      'options',
      ow.object.exactShape({version: ow.optional.number.integer, baseComponents: ow.optional.array})
    );

    const {version, baseComponents = []} = options;

    this._componentServer = componentServer;
    this._version = version;
    this._setBaseComponents(baseComponents);
  }

  _setBaseComponents(baseComponents) {
    this._baseComponents = Object.create(null);

    for (const BaseComponent of baseComponents) {
      validateIsComponentClass(BaseComponent);

      const name = BaseComponent.getComponentName();

      if (!hasOwnProperty(BaseComponent, '__ComponentMixin')) {
        throw new Error(
          `The base component ('${name}') is not a Liaison base component such as Component, Model, Entity, or Storable`
        );
      }

      this._baseComponents[name] = BaseComponent;
    }
  }

  getName() {
    return possiblyAsync(this._introspectComponentServer(), {
      then: ({name}) => name
    });
  }

  getComponent(name, options = {}) {
    ow(name, 'name', ow.string.nonEmpty);
    ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

    const {throwIfMissing = true} = options;

    return possiblyAsync(this.getComponents(), {
      then: () => {
        validateComponentName(name, {allowInstances: false});

        const Component = this._componentMap[name];

        if (Component !== undefined) {
          return Component;
        }

        if (throwIfMissing) {
          throw new Error(`The component class '${name}' is missing in the component client`);
        }
      }
    });
  }

  getComponents() {
    if (this._components === undefined) {
      return this._createComponents();
    }

    return this._components;
  }

  _createComponents() {
    this._components = [];
    this.__relatedComponentNames = new Map();

    return possiblyAsync(this._introspectComponentServer(), {
      then: ({components: introspectedComponents}) => {
        for (const introspectedComponent of introspectedComponents) {
          const Component = this._createComponent(introspectedComponent);
          this._components.push(Component);
        }

        this._componentMap = createComponentMap(this._components);

        for (const [Component, relatedComponentNames] of this.__relatedComponentNames.entries()) {
          for (const relatedComponentName of relatedComponentNames) {
            const RelatedComponent = this._componentMap[relatedComponentName];

            if (RelatedComponent !== undefined) {
              Component.registerRelatedComponent(RelatedComponent);
            }
          }
        }

        return this._components;
      }
    });
  }

  _createComponent({name, type, properties, relatedComponents, prototype}) {
    const BaseComponent = this._baseComponents[type];

    if (BaseComponent === undefined) {
      throw new Error(`The base component '${type}' is unknown`);
    }

    class RemoteComponentProxy {}

    this._createRemoteComponentProxyMethods(RemoteComponentProxy, properties);
    this._createRemoteComponentProxyMethods(RemoteComponentProxy.prototype, prototype?.properties);

    class RemoteComponent extends BaseComponent.__ComponentMixin(RemoteComponentProxy) {}

    RemoteComponent.__setRemoteComponent(RemoteComponent);

    RemoteComponent.unintrospect({name, properties, prototype});

    if (relatedComponents !== undefined) {
      this.__relatedComponentNames.set(RemoteComponent, relatedComponents);
    }

    return RemoteComponent;
  }

  _createRemoteComponentProxyMethods(component, properties) {
    if (properties === undefined) {
      return;
    }

    for (const {name, exposure} of properties) {
      if (exposure.call === true) {
        Object.defineProperty(component, name, {
          value: this._createRemoteComponentProxyMethod(name),
          writable: true,
          enumerable: false,
          configurable: true
        });
      }
    }
  }

  _createRemoteComponentProxyMethod(name) {
    const componentClient = this;

    return function(...args) {
      const query = {
        '<=': this,
        [`${name}=>`]: {'()': args}
      };

      const Component = getClassOf(this);

      const componentGetter = name => {
        return Component.getComponent(name, {includePrototypes: true});
      };

      return componentClient.send({query}, {componentGetter});
    };
  }

  _introspectComponentServer() {
    if (this._introspectedComponentServer === undefined) {
      const query = {'introspect=>': {'()': []}};

      return possiblyAsync(this.send({query}), {
        then: introspectedComponentServer => {
          this._introspectedComponentServer = introspectedComponentServer;
          return introspectedComponentServer;
        }
      });
    }

    return this._introspectedComponentServer;
  }

  send(request, options = {}) {
    ow(request, 'request', ow.object.exactShape({query: ow.object, components: ow.optional.array}));
    ow(options, 'options', ow.object.exactShape({componentGetter: ow.optional.function}));

    const {componentGetter} = options;

    const componentServer = this._componentServer;
    const version = this._version;

    const attributeFilter = function(attribute) {
      // Exclude properties that cannot be set in the remote components

      const remoteComponent = this.getRemoteComponent();
      const remoteAttribute = remoteComponent.getAttribute(attribute.getName(), {
        throwIfMissing: false
      });

      if (remoteAttribute !== undefined) {
        return remoteAttribute.operationIsAllowed('set');
      }

      return false;
    };

    const errorHandler = function(error) {
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
      {
        then: ({result, components}) => {
          debug(`Query sent to remote components (result: %o, components: %o)`, result, components);

          return this._deserializeResponse({result, components}, {componentGetter, errorHandler});
        }
      }
    );
  }

  _serializeRequest({query, components}, {attributeFilter}) {
    const referencedComponents = new Set(components);

    const serializedQuery = serialize(query, {
      returnComponentReferences: true,
      referencedComponents,
      attributeFilter,
      target: 'parent'
    });

    let serializedComponents;
    const handledReferencedComponents = new Set();

    const serializeReferencedComponents = function(referencedComponents) {
      if (referencedComponents.size === 0) {
        return;
      }

      const additionalReferencedComponents = new Set();

      for (const referencedComponent of referencedComponents.values()) {
        if (handledReferencedComponents.has(referencedComponent)) {
          continue;
        }

        const serializedComponent = referencedComponent.serialize({
          referencedComponents: additionalReferencedComponents,
          ignoreEmptyComponents: true,
          attributeFilter,
          target: 'parent'
        });

        if (serializedComponent !== undefined) {
          if (serializedComponents === undefined) {
            serializedComponents = [];
          }

          serializedComponents.push(serializedComponent);
        }

        handledReferencedComponents.add(referencedComponent);
      }

      serializeReferencedComponents(additionalReferencedComponents);
    };

    serializeReferencedComponents(referencedComponents);

    return {serializedQuery, serializedComponents};
  }

  _deserializeResponse(response, {componentGetter, errorHandler}) {
    const {result: serializedResult, components: serializedComponents} = response;

    deserialize(serializedComponents, {
      componentGetter,
      deserializeFunctions: true,
      errorHandler,
      source: 'parent'
    });

    return deserialize(serializedResult, {
      componentGetter,
      deserializeFunctions: true,
      errorHandler,
      source: 'parent'
    });
  }

  static isComponentClient(object) {
    return isComponentClient(object);
  }
}

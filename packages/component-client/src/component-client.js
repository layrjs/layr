import {
  validateIsComponentClass,
  validateComponentName,
  getComponentClassNameFromComponentInstanceName,
  createComponentMap,
  serialize,
  deserialize
} from '@liaison/component';
import {hasOwnProperty, getClassOf} from 'core-helpers';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';
import debugModule from 'debug';

const debug = debugModule('liaison:component-client');

// To display the debug log, set this environment:
// DEBUG=liaison:component-client DEBUG_DEPTH=10

export class ComponentClient {
  constructor(componentServer, options = {}) {
    ow(componentServer, 'componentServer', ow.object);
    ow(
      options,
      'options',
      ow.object.exactShape({version: ow.optional.number.integer, baseComponents: ow.optional.array})
    );

    if (typeof componentServer.receiveQuery !== 'function') {
      throw new Error(
        'The ComponentClient constructor expects a ComponentServer instance to be passed as the first parameter'
      );
    }

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
    ow(
      options,
      'options',
      ow.object.exactShape({
        throwIfMissing: ow.optional.boolean,
        includePrototypes: ow.optional.boolean
      })
    );

    const {throwIfMissing = true, includePrototypes = false} = options;

    return possiblyAsync(this.getComponents(), {
      then: () => {
        const isInstanceName =
          validateComponentName(name, {allowInstances: includePrototypes}) ===
          'componentInstanceName';

        const className = isInstanceName
          ? getComponentClassNameFromComponentInstanceName(name)
          : name;

        const Component = this._componentMap[className];

        if (Component !== undefined) {
          return isInstanceName ? Component.prototype : Component;
        }

        if (throwIfMissing) {
          throw new Error(`The component class '${className}' is missing in the component client`);
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
        [`${name}=>result`]: {
          '()': args
        },
        '=>self': true
      };

      const Component = getClassOf(this);

      const componentGetter = name => {
        return Component.getComponent(name, {includePrototypes: true});
      };

      return possiblyAsync(componentClient.sendQuery(query, {componentGetter}), {
        then: result => result.result
      });
    };
  }

  _introspectComponentServer() {
    if (this._introspectedComponentServer === undefined) {
      return possiblyAsync(this.sendQuery({'introspect=>': {'()': []}}), {
        then: introspectedComponentServer => {
          this._introspectedComponentServer = introspectedComponentServer;
          return introspectedComponentServer;
        }
      });
    }

    return this._introspectedComponentServer;
  }

  sendQuery(query, options = {}) {
    ow(query, 'query', ow.object);
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

    query = serialize(query, {attributeFilter, target: 'parent'});

    debug(`Sending query to remote components (query: %o)`, query);
    return possiblyAsync(componentServer.receiveQuery(query, {version}), {
      then: result => {
        debug(`Query sent to remote components (result: %o)`, result);
        return deserialize(result, {componentGetter, deserializeFunctions: true, source: 'parent'});
      }
    });
  }
}

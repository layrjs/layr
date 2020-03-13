import {
  validateComponentName,
  getComponentClassNameFromComponentInstanceName,
  createComponentMap,
  serialize,
  deserialize
} from '@liaison/component';
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
    this._baseComponents = createComponentMap(baseComponents);
  }

  getComponent(name, options = {}) {
    ow(name, 'name', ow.string.nonEmpty);
    ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

    const {throwIfMissing = true} = options;

    return possiblyAsync(this.getComponents(), {
      then: components => {
        const component = components[name];

        if (component !== undefined) {
          return component;
        }

        if (throwIfMissing) {
          throw new Error(`The component '${name}' is missing in the component client`);
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
    this._components = Object.create(null);
    this.__relatedComponentNames = new Map();

    return possiblyAsync(this._introspectRemoteComponents(), {
      then: introspectedComponents => {
        for (const introspectedComponent of introspectedComponents) {
          this._createComponent(introspectedComponent);
        }

        for (const [component, relatedComponentNames] of this.__relatedComponentNames.entries()) {
          for (const relatedComponentName of relatedComponentNames) {
            const relatedComponent = this._components[relatedComponentName];

            if (relatedComponent !== undefined) {
              component.registerRelatedComponent(relatedComponent);
            }
          }
        }

        return this._components;
      }
    });
  }

  _createComponent({name, type, properties, relatedComponents}) {
    let component = this._components[name];

    if (component === undefined) {
      const validateComponentNameResult = validateComponentName(name);

      if (validateComponentNameResult === 'componentClassName') {
        component = this._createComponentClass({name, type});
      } else {
        component = this._createComponentPrototype({name, type});
      }

      component.unintrospect(
        {name, properties},
        {methodCreator: this._createComponentMethod.bind(this)}
      );

      this._components[name] = component;
    } else if (component.getComponentType() !== type) {
      throw new Error(
        `Cannot change the type of an existing component (component name: '${name}', current type: '${component.getComponentType()}', specified type: '${type}')`
      );
    }

    if (relatedComponents !== undefined) {
      this.__relatedComponentNames.set(component, relatedComponents);
    }

    return component;
  }

  _createComponentClass({name, type}) {
    validateComponentName(name, {allowInstances: false});
    validateComponentName(type, {allowInstances: false});

    const BaseComponent = this._baseComponents[type];

    if (BaseComponent === undefined) {
      throw new Error(`Unknown base component ('${type}') received from a component server`);
    }

    return class Component extends BaseComponent {};
  }

  _createComponentPrototype({name, type}) {
    validateComponentName(name, {allowClasses: false});
    validateComponentName(type, {allowClasses: false});

    const Component = this._createComponent({
      name: getComponentClassNameFromComponentInstanceName(name),
      type: getComponentClassNameFromComponentInstanceName(type)
    });

    return Component.prototype;
  }

  _createComponentMethod(name) {
    const componentClient = this;

    return function(...args) {
      const query = {
        '<=': this,
        [`${name}=>result`]: {
          '()': args
        },
        '=>self': true
      };

      return possiblyAsync(componentClient.sendQuery(query), {
        then: result => result.result
      });
    };
  }

  _introspectRemoteComponents() {
    return possiblyAsync(this.sendQuery({'introspect=>': {'()': []}}), {
      then: ({components: introspectedComponents}) => introspectedComponents
    });
  }

  sendQuery(query) {
    ow(query, 'query', ow.object);

    const componentClient = this;
    const componentServer = this._componentServer;
    const version = this._version;

    const componentGetter = function(name) {
      return componentClient.getComponent(name);
    };

    const attributeFilter = function(attribute) {
      // Exclude properties that cannot be set in the remote components

      const remoteComponent = componentClient.getComponent(this.getComponentName());
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

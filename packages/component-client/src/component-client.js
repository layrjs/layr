import {
  Component,
  validateComponentName,
  getComponentClassNameFromComponentInstanceName,
  Property,
  Attribute,
  Method,
  isMethodClass,
  Model,
  ModelAttribute,
  Entity,
  PrimaryIdentifierAttribute,
  SecondaryIdentifierAttribute,
  serialize,
  deserialize
} from '@liaison/entity';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';
import debugModule from 'debug';

const BaseComponent = Component();
const BaseModel = Model();
const BaseEntity = Entity();

const debug = debugModule('liaison:component-client');

// To display the debug log, set this environment:
// DEBUG=liaison:component-client DEBUG_DEPTH=10

export class ComponentClient {
  constructor(componentServer, options = {}) {
    ow(componentServer, 'componentServer', ow.object);
    ow(options, 'options', ow.object.exactShape({version: ow.optional.number.integer}));

    if (typeof componentServer.receiveQuery !== 'function') {
      throw new Error(
        'The ComponentClient constructor expects a ComponentServer instance to be passed as the first parameter'
      );
    }

    const {version} = options;

    this._componentServer = componentServer;
    this._version = version;
  }

  // TODO: Make getComponent*() methods possibly async

  getComponent(name, options = {}) {
    ow(name, 'name', ow.string.nonEmpty);
    ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

    const {throwIfMissing = true} = options;

    const components = this.getComponents();
    const component = components[name];

    if (component !== undefined) {
      return component;
    }

    if (throwIfMissing) {
      throw new Error(`The component '${name}' is missing in the component client`);
    }
  }

  getComponents() {
    if (this._components === undefined) {
      this._createComponents();
    }

    return this._components;
  }

  _createComponents() {
    this._components = Object.create(null);

    const {components: introspectedComponents} = this._introspectRemoteComponents();

    for (const introspectedComponent of introspectedComponents) {
      this._createComponent(introspectedComponent);
    }
  }

  _createComponent({name, type, properties}) {
    let component = this._components[name];

    if (component === undefined) {
      const validateComponentNameResult = validateComponentName(name);

      if (validateComponentNameResult === 'componentClassName') {
        component = this._createComponentClass({name, type});
      } else {
        component = this._createComponentPrototype({name, type});
      }

      this._components[name] = component;
    } else if (component.getComponentType() !== type) {
      throw new Error(
        `Cannot change the type of an existing component (component name: '${name}', current type: '${component.getComponentType()}', specified type: '${type}')`
      );
    }

    if (properties !== undefined) {
      for (const property of properties) {
        this._setComponentProperty(component, property);
      }
    }

    return component;
  }

  _createComponentClass({name, type}) {
    validateComponentName(name, {allowInstances: false});
    validateComponentName(type, {allowInstances: false});

    let BaseComponentClass;

    if (type === 'Component') {
      BaseComponentClass = BaseComponent;
    } else if (type === 'Model') {
      BaseComponentClass = BaseModel;
    } else if (type === 'Entity') {
      BaseComponentClass = BaseEntity;
    } else {
      throw new Error(`Unknown component class type ('${type}') received from a component server`);
    }

    const Component = class Component extends BaseComponentClass {};

    Component.setComponentName(name);

    return Component;
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

  _setComponentProperty(component, {name, type, ...options}) {
    let PropertyClass;

    if (type === 'property') {
      PropertyClass = Property;
    } else if (type === 'attribute') {
      PropertyClass = Attribute;
    } else if (type === 'method') {
      PropertyClass = Method;
    } else if (type === 'modelAttribute') {
      PropertyClass = ModelAttribute;
      options.type = options.valueType;
      delete options.valueType;
    } else if (type === 'primaryIdentifierAttribute') {
      PropertyClass = PrimaryIdentifierAttribute;
      options.type = options.valueType;
      delete options.valueType;
    } else if (type === 'secondaryIdentifierAttribute') {
      PropertyClass = SecondaryIdentifierAttribute;
      options.type = options.valueType;
      delete options.valueType;
    } else {
      throw new Error(`Unknown property type (${type}) received from a component server`);
    }

    component.setProperty(name, PropertyClass, options);

    if (isMethodClass(PropertyClass)) {
      Object.defineProperty(component, name, {
        value: this._createComponentMethod(name),
        writable: true,
        enumerable: false,
        configurable: true
      });
    }
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
    debug(`Introspecting the remote components`);

    const introspection = this.sendQuery({'introspect=>': {'()': []}});

    debug(`Remote components introspected`);

    return introspection;
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

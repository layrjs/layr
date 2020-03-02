import {
  Component,
  isComponentClass,
  Property,
  Attribute,
  Method,
  isMethodClass,
  createComponentMap
} from '@liaison/component';
import {Model, ModelAttribute, serialize, deserialize} from '@liaison/model';
import {possiblyAsync} from 'possibly-async';
import {getClassOf} from 'core-helpers';
import ow from 'ow';
import debugModule from 'debug';

const BaseComponentClass = Component();
const BaseModelClass = Model();

const debug = debugModule('liaison:component-client');

// To display the debug log, set this environment:
// DEBUG=liaison:component-client DEBUG_DEPTH=10

export class ComponentClient {
  constructor(componentServer, options = {}) {
    ow(componentServer, 'componentServer', ow.object);
    ow(options, 'options', ow.object.exactShape({version: ow.optional.number.integer}));

    if (typeof componentServer.receiveQuery !== 'function') {
      throw new Error(
        'ComponentClient constructor expects a ComponentServer instance to be passed as the first parameter'
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

    const componentMap = this._getComponentMap();
    const Component = componentMap[name];

    if (Component === undefined) {
      if (throwIfMissing) {
        throw new Error(`The component '${name}' is missing in the component client`);
      }
      return undefined;
    }

    return Component;
  }

  getComponents() {
    if (this._components === undefined) {
      this._components = this._createComponents();
    }

    return this._components;
  }

  _getComponentMap() {
    if (this._componentMap === undefined) {
      const components = this.getComponents();
      this._componentMap = createComponentMap(components);
    }

    return this._componentMap;
  }

  _createComponents() {
    const {components: introspectedComponents} = this._introspectRemoteComponents();

    return introspectedComponents.map(introspectedComponent =>
      this._createComponent(introspectedComponent)
    );
  }

  _createComponent(introspectedComponent) {
    const {name, type, properties, prototype} = introspectedComponent;

    let ComponentClass;

    if (type === 'Component') {
      ComponentClass = BaseComponentClass;
    } else if (type === 'Model') {
      ComponentClass = BaseModelClass;
    } else {
      throw new Error(`Unknown component type (${type}) received from a component server`);
    }

    const Component = class Component extends ComponentClass {};

    Component.setName(name);
    this._setComponentProperties(Component, properties);
    this._setComponentProperties(Component.prototype, prototype?.properties);

    return Component;
  }

  _setComponentProperties(component, introspectedProperties) {
    if (introspectedProperties === undefined) {
      return;
    }

    for (const introspectedProperty of introspectedProperties) {
      this._setComponentProperty(component, introspectedProperty);
    }
  }

  _setComponentProperty(component, introspectedProperty) {
    const {name, type, ...options} = introspectedProperty;

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

      // TODO: if 'this' is in a layer, provide layer's components
      // through the 'componentProvider' serialize()/deserialize() parameter
      const knownComponents = [getClassOf(this)];

      return possiblyAsync(componentClient.sendQuery(query, {knownComponents}), {
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

  sendQuery(query, options = {}) {
    ow(query, 'query', ow.object);
    ow(options, 'options', ow.object.exactShape({knownComponents: ow.optional.array}));

    const {knownComponents} = options;

    const componentClient = this;
    const componentServer = this._componentServer;
    const version = this._version;

    const attributeFilter = function(attribute) {
      // Exclude properties that cannot be set in the remote components

      const isClass = isComponentClass(this);
      const LocalComponent = isClass ? this : this.constructor;
      const RemoteComponent = componentClient.getComponent(LocalComponent.getName());
      const remoteComponent = isClass ? RemoteComponent : RemoteComponent.prototype;

      const remoteAttribute = remoteComponent.getAttribute(attribute.getName(), {
        throwIfMissing: false
      });

      if (remoteAttribute !== undefined) {
        return remoteAttribute.operationIsAllowed('set');
      }

      return false;
    };

    query = serialize(query, {knownComponents, attributeFilter, target: 'parent'});

    debug(`Sending query to remote components (query: %o)`, query);
    return possiblyAsync(componentServer.receiveQuery(query, {version}), {
      then: result => {
        debug(`Query sent to remote components (result: %o)`, result);
        return deserialize(result, {knownComponents, deserializeFunctions: true, source: 'parent'});
      }
    });
  }
}

import {
  isComponentClass,
  isComponentClassOrInstance,
  validateComponentName,
  getComponentClassNameFromComponentInstanceName,
  serialize,
  deserialize,
  createComponentMap,
  getComponentFromComponentMap
} from '@liaison/component';
import {invokeQuery} from '@deepr/runtime';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

import {isComponentServer} from './utilities';

export class ComponentServer {
  constructor(componentProvider, options = {}) {
    ow(componentProvider, 'componentProvider', ow.function);
    ow(
      options,
      'options',
      ow.object.exactShape({name: ow.optional.string.nonEmpty, version: ow.optional.number.integer})
    );

    const {name, version} = options;

    this._componentProvider = componentProvider;
    this._name = name;
    this._version = version;
  }

  receiveQuery(query, options = {}) {
    ow(query, 'query', ow.object);
    ow(options, 'options', ow.object.exactShape({version: ow.optional.number.integer}));

    const {version: clientVersion} = options;

    this.validateVersion(clientVersion);

    const components = this.getComponents();

    const root = this.getRoot(components);

    const componentMap = createComponentMap(components);

    const componentGetter = name => {
      const isInstanceName = validateComponentName(name) === 'componentInstanceName';

      const className = isInstanceName
        ? getComponentClassNameFromComponentInstanceName(name)
        : name;

      const Component = getComponentFromComponentMap(componentMap, className);

      return isInstanceName ? Component.prototype : Component;
    };

    const getFilter = function(attribute) {
      return attribute.operationIsAllowed('get');
    };

    const setFilter = function(attribute) {
      return attribute.operationIsAllowed('set');
    };

    const authorizer = function(name, operation, _params) {
      if (this === root && name === 'introspect' && operation === 'call') {
        return true;
      }

      if (isComponentClassOrInstance(this)) {
        const property = this.getProperty(name, {throwIfMissing: false});

        if (property !== undefined) {
          return property.operationIsAllowed(operation);
        }
      }

      return false;
    };

    return possiblyAsync.call([
      () => {
        return deserialize(query, {
          componentGetter,
          attributeFilter: setFilter,
          source: 'child'
        });
      },
      deserializedQuery => {
        return invokeQuery(root, deserializedQuery, {authorizer});
      },
      result => {
        return serialize(result, {
          attributeFilter: getFilter,
          serializeFunctions: true,
          target: 'child'
        });
      }
    ]);
  }

  validateVersion(clientVersion) {
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

  getComponents() {
    const components = this._componentProvider();

    if (typeof components?.[Symbol.iterator] !== 'function') {
      throw new Error("The 'componentProvider' function didn't return an iterable object");
    }

    for (const Component of components) {
      if (!isComponentClass(Component)) {
        throw new Error(
          "The 'componentProvider' function returned an iterable containing an item that is not a component class"
        );
      }
    }

    return components;
  }

  getRoot(components) {
    const componentServer = this;

    const root = Object.create(null);

    root.introspect = function() {
      const introspectedComponentServer = {};

      if (componentServer._name !== undefined) {
        introspectedComponentServer.name = componentServer._name;
      }

      const introspectedComponents = [];

      for (const Component of components) {
        const introspectedComponent = Component.introspect();

        if (introspectedComponent !== undefined) {
          introspectedComponents.push(introspectedComponent);
        }
      }

      introspectedComponentServer.components = introspectedComponents;

      return introspectedComponentServer;
    };

    return root;
  }

  static isComponentServer(object) {
    return isComponentServer(object);
  }
}

import {
  isComponentClassOrInstance,
  validateComponentName,
  getComponentClassNameFromComponentInstanceName,
  serialize,
  deserialize,
  createComponentMap,
  getComponentFromComponentMap,
  getTypeof
} from '@liaison/component';
import {invokeQuery} from '@deepr/runtime';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

import {isComponentServer} from './utilities';

export class ComponentServer {
  constructor(componentProvider, options = {}) {
    ow(
      options,
      'options',
      ow.object.exactShape({name: ow.optional.string.nonEmpty, version: ow.optional.number.integer})
    );

    const {name, version} = options;

    componentProvider = this._normalizeComponentProvider(componentProvider);

    this._componentProvider = componentProvider;
    this._name = name;
    this._version = version;
  }

  _normalizeComponentProvider(componentProvider) {
    if (Array.isArray(componentProvider)) {
      const components = componentProvider;

      componentProvider = this._createComponentProvider(components);

      return componentProvider;
    }

    if (typeof componentProvider === 'object' && componentProvider !== null) {
      this._validateComponentProvider(componentProvider);

      return componentProvider;
    }

    throw new Error(
      `Expected an array of components or a component provider object, but received a value of type '${getTypeof(
        componentProvider
      )}'`
    );
  }

  _createComponentProvider(components) {
    const componentMap = createComponentMap(components);

    const getComponent = function(name, {autoFork = true, cache} = {}) {
      const Component = getComponentFromComponentMap(componentMap, name);

      if (autoFork) {
        let forkedComponents = cache.forkedComponents;

        if (forkedComponents === undefined) {
          forkedComponents = Object.create(null);
          cache.forkedComponents = forkedComponents;
        }

        let ForkedComponent = forkedComponents[name];

        if (ForkedComponent === undefined) {
          ForkedComponent = Component.fork();
          forkedComponents[name] = ForkedComponent;
        }

        return ForkedComponent;
      }

      return Component;
    };

    let componentNames;

    const getComponentNames = function() {
      if (componentNames === undefined) {
        componentNames = Object.keys(componentMap);
      }

      return componentNames;
    };

    return {getComponent, getComponentNames};
  }

  _validateComponentProvider(componentProvider) {
    if (
      !(
        typeof componentProvider.getComponent === 'function' &&
        typeof componentProvider.getComponentNames === 'function'
      )
    ) {
      throw new Error(
        `A component provider should be an object composed of two methods: getComponent() and getComponentNames()`
      );
    }
  }

  receiveQuery(query, options = {}) {
    ow(query, 'query', ow.object);
    ow(options, 'options', ow.object.exactShape({version: ow.optional.number.integer}));

    const {version: clientVersion} = options;

    this.validateVersion(clientVersion);

    const root = this.getRoot();

    const cache = {};

    const componentGetter = name => {
      const isInstanceName = validateComponentName(name) === 'componentInstanceName';

      const className = isInstanceName
        ? getComponentClassNameFromComponentInstanceName(name)
        : name;

      const Component = this._componentProvider.getComponent(className, {autoFork: true, cache});

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

  getRoot() {
    if (this._root === undefined) {
      this._root = Object.create(null);

      let introspectedComponentServer;

      this._root.introspect = () => {
        if (introspectedComponentServer === undefined) {
          introspectedComponentServer = {};

          if (this._name !== undefined) {
            introspectedComponentServer.name = this._name;
          }

          const introspectedComponents = [];

          for (const name of this._componentProvider.getComponentNames()) {
            const Component = this._componentProvider.getComponent(name, {autoFork: false});

            const introspectedComponent = Component.introspect();

            if (introspectedComponent !== undefined) {
              introspectedComponents.push(introspectedComponent);
            }
          }

          introspectedComponentServer.components = introspectedComponents;
        }

        return introspectedComponentServer;
      };
    }

    return this._root;
  }

  static isComponentServer(object) {
    return isComponentServer(object);
  }
}

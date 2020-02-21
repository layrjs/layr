import {isComponent} from '@liaison/component';
import {invokeQuery} from '@deepr/runtime';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

import {serialize, deserialize} from '@liaison/model';

export class ComponentServer {
  constructor(componentProvider, options = {}) {
    ow(componentProvider, 'componentProvider', ow.function);
    ow(options, 'options', ow.object.exactShape({version: ow.optional.number.integer}));

    const {version} = options;

    this._componentProvider = componentProvider;
    this._version = version;
  }

  receiveQuery(query, options = {}) {
    ow(query, 'query', ow.object);
    ow(options, 'options', ow.object.exactShape({version: ow.optional.number.integer}));

    const {version: clientVersion} = options;

    this.validateVersion(clientVersion);

    const components = this.getComponents();

    const root = this.getRoot(components);

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

      if (isComponent(this.prototype) || isComponent(this)) {
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
          knownComponents: components,
          attributeFilter: setFilter,
          source: 'child'
        });
      },
      deserializedQuery => {
        return invokeQuery(root, deserializedQuery, {authorizer});
      },
      result => {
        return serialize(result, {
          knownComponents: components,
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
        {code: 'COMPONENT_CLIENT_VERSION_DOES_NOT_MATCH_COMPONENT_SERVER_VERSION'}
      );
    }
  }

  getComponents() {
    const components = this._componentProvider();

    if (!Array.isArray(components)) {
      throw new Error("The 'componentProvider' function didn't return an array");
    }

    for (const component of components) {
      if (!isComponent(component.prototype)) {
        throw new Error(
          "The 'componentProvider' function returned an array containing an item that is not a component"
        );
      }
    }

    return components;
  }

  getRoot(components) {
    const root = Object.create(null);

    root.introspect = function() {
      const introspectedComponents = [];

      for (const component of components) {
        const introspectedComponent = component.introspect();

        if (introspectedComponent !== undefined) {
          introspectedComponents.push(introspectedComponent);
        }
      }

      return {components: introspectedComponents};
    };

    return root;
  }
}

import {
  isComponentClass,
  isComponentInstance,
  getTypeOf,
  composeDescription
} from '@liaison/component';
import {hasOwnProperty, isPrototypeOf} from 'core-helpers';
import upperFirst from 'lodash/upperFirst';
import ow from 'ow';

import {isLayer} from './utilities';

export class Layer {
  constructor(components, options = {}) {
    ow(components, 'components', ow.optional.array);
    ow(options, 'options', ow.object.exactShape({name: ow.optional.string.nonEmpty}));

    const {name} = options;

    this._components = Object.create(null);

    if (name !== undefined) {
      this.setName(name);
    }

    if (components !== undefined) {
      for (const component of components) {
        this.registerComponent(component);
      }
    }
  }

  getName() {
    return this._name;
  }

  setName(name) {
    ow(name, ow.optional.string.nonEmpty);

    this._name = name;
  }

  unsetName() {
    this._name = undefined;
  }

  // === Components ===

  getComponent(name, options = {}) {
    ow(name, ow.string.nonEmpty);
    ow(
      options,
      'options',
      ow.object.exactShape({
        throwIfMissing: ow.optional.boolean,
        includePrototypes: ow.optional.boolean
      })
    );

    const {throwIfMissing = true, includePrototypes = false} = options;

    let component = this._components[name];

    if (!includePrototypes && isComponentInstance(component)) {
      component = undefined;
    }

    if (component === undefined) {
      if (throwIfMissing) {
        throw new Error(
          `The component '${name}' is not registered in the layer${composeDescription([
            this.describe()
          ])}`
        );
      }

      return undefined;
    }

    if (!hasOwnProperty(this._components, name)) {
      // Since the layer has been forked, the component must be forked as well
      component = this._forkComponent(component);
      this._components[name] = component;
    }

    return component;
  }

  registerComponent(Component) {
    if (isComponentInstance(Component)) {
      throw new Error(
        `Expected a component class, but received a component instance${composeDescription([
          this.describe(),
          Component.describeComponent({includeLayer: false})
        ])}`
      );
    }

    if (!isComponentClass(Component)) {
      throw new Error(
        `Expected a component class, but received a value of type '${getTypeOf(
          Component
        )}'${composeDescription([this.describe()])}`
      );
    }

    if (Component.hasLayer()) {
      throw new Error(
        `Cannot register ${Component.describeComponentType()} that is already registered${composeDescription(
          [
            this.describe({layerSuffix: 'requested'}),
            Component.describeComponent({layerSuffix: 'registered'})
          ]
        )}`
      );
    }

    const componentName = Component.getComponentName();
    const existingComponent = this._components[componentName];

    if (existingComponent !== undefined) {
      throw new Error(
        `${upperFirst(
          Component.describeComponentType()
        )} with the same name is already registered (${existingComponent.describeComponent()})`
      );
    }

    const register = component => {
      const componentName = component.getComponentName();

      if (isComponentClass(component)) {
        if (componentName in this) {
          throw new Error(
            `Cannot register ${component.describeComponentType()} that has the same name as an existing property${composeDescription(
              [this.describe(), component.describeComponent()]
            )}`
          );
        }

        Object.defineProperty(this, componentName, {
          get() {
            return this.getComponent(componentName);
          }
        });
      }

      this._components[componentName] = component;
    };

    register(Component);
    register(Component.prototype);

    Component.setLayer(this);
  }

  getComponents(options = {}) {
    ow(
      options,
      'options',
      ow.object.exactShape({filter: ow.optional.function, includePrototypes: ow.optional.boolean})
    );

    const {filter, includePrototypes = false} = options;

    const layer = this;

    return {
      *[Symbol.iterator]() {
        // eslint-disable-next-line guard-for-in
        for (const name in layer._components) {
          const component = layer.getComponent(name, {throwIfMissing: false, includePrototypes});

          if (component === undefined) {
            continue;
          }

          if (filter && !filter(component)) {
            continue;
          }

          yield component;
        }
      }
    };
  }

  // === Forking ===

  fork() {
    const forkedLayer = Object.create(this);

    forkedLayer._components = Object.create(this._components);

    return forkedLayer;
  }

  isForkOf(layer) {
    if (!isLayer(layer)) {
      throw new Error(`Expected a layer, but received a value of type '${getTypeOf(layer)}'`);
    }

    return isPrototypeOf(layer, this);
  }

  getGhost() {
    if (!this._ghost) {
      this._ghost = this.fork();
    }

    return this._ghost;
  }

  get ghost() {
    return this.getGhost();
  }

  _forkComponent(component) {
    let forkedComponent;

    if (isComponentClass(component)) {
      forkedComponent = component.fork();
      forkedComponent.setLayer(this);
    } else {
      const componentClassName = component.constructor.getComponentName();
      const Component = this.getComponent(componentClassName);
      forkedComponent = Component.prototype;
    }

    return forkedComponent;
  }

  // === Utilities ===

  static isLayer(object) {
    return isLayer(object);
  }

  describe(options = {}) {
    ow(options, 'options', ow.object.exactShape({layerSuffix: ow.optional.string}));

    let {layerSuffix = ''} = options;

    if (layerSuffix !== '') {
      layerSuffix = `${layerSuffix} `;
    }

    return this.getName() !== undefined ? `${layerSuffix}layer name: '${this.getName()}'` : '';
  }
}

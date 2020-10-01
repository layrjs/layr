import {hasOwnProperty, PlainObject} from 'core-helpers';

import type {Component} from './component';

type IdentifierValue = string | number;

/**
 * A class to manage the instances of the [`Component`](https://liaison.dev/docs/v1/reference/component) classes that are identifiable.
 *
 * A component class is identifiable when its prototype has a [`PrimaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/primary-identifier-attribute).
 *
 * When a component class is identifiable, the `IdentityMap` ensures that there can only be one component instance with a specific identifier. So if you try to create two components with the same identifer, you will get an error.
 *
 * #### Usage
 *
 * You shouldn't have to create an `IdentityMap` by yourself. Identity maps are created automatically for each [`Component`](https://liaison.dev/docs/v1/reference/component) class that are identifiable.
 *
 * **Example:**
 *
 * Here is a `Movie` component with an `id` primary identifier attribute:
 *
 * ```
 * // JS
 *
 * import {Component, primaryIdentifier, attribute} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   ﹫primaryIdentifier() id;
 *   ﹫attribute('string') title;
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component, primaryIdentifier, attribute} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   ﹫primaryIdentifier() id!: string;
 *   ﹫attribute('string') title!: string;
 * }
 * ```
 *
 * To get the `IdentityMap` of the `Movie` component, simply do:
 *
 * ```
 * const identityMap = Movie.getIdentityMap();
 * ```
 *
 * Currently, the `IdentifyMap` provides only one public method — [`getComponent()`](https://liaison.dev/docs/v1/reference/identity-map#get-component-instance-method) — that allows to retrieve a component instance from its identifier:
 *
 * ```
 * const movie = new Movie({id: 'abc123', title: 'Inception'});
 *
 * identityMap.getComponent('abc123'); // => movie
 * ```
 */
export class IdentityMap {
  _parent: typeof Component;

  constructor(parent: typeof Component) {
    this._parent = parent;
  }

  getParent() {
    return this._parent;
  }

  fork(newParent: typeof Component) {
    const forkedIdentityMap = Object.create(this) as IdentityMap;
    forkedIdentityMap._parent = newParent;
    return forkedIdentityMap;
  }

  // === Entities ===

  /**
   * Gets a component instance from one of its identifiers. If there are no components corresponding to the specified identifiers, returns `undefined`.
   *
   * @param identifiers A plain object specifying some identifiers. The shape of the object should be `{[identifierName]: identifierValue}`. Alternatively, you can specify a string or a number representing the value of the [`PrimaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/primary-identifier-attribute) of the component you want to get.
   *
   * @returns A [`Component`](https://liaison.dev/docs/v1/reference/component) instance or `undefined`.
   *
   * @example
   * ```
   * // JS
   *
   * import {Component, primaryIdentifier, secondaryIdentifier} from '﹫liaison/component';
   *
   * class Movie extends Component {
   *   ﹫primaryIdentifier() id;
   *   ﹫secondaryIdentifier() slug;
   * }
   *
   * const movie = new Movie({id: 'abc123', slug: 'inception'});
   *
   * Movie.getIdentityMap().getComponent('abc123'); // => movie
   * Movie.getIdentityMap().getComponent({id: 'abc123'}); // => movie
   * Movie.getIdentityMap().getComponent({slug: 'inception'}); // => movie
   * Movie.getIdentityMap().getComponent('xyx456'); // => undefined
   * ```
   *
   * @example
   * ```
   * // TS
   *
   * import {Component, primaryIdentifier, secondaryIdentifier} from '﹫liaison/component';
   *
   * class Movie extends Component {
   *   ﹫primaryIdentifier() id!: string;
   *   ﹫secondaryIdentifier() slug!: string;
   * }
   *
   * const movie = new Movie({id: 'abc123', slug: 'inception'});
   *
   * Movie.getIdentityMap().getComponent('abc123'); // => movie
   * Movie.getIdentityMap().getComponent({id: 'abc123'}); // => movie
   * Movie.getIdentityMap().getComponent({slug: 'inception'}); // => movie
   * Movie.getIdentityMap().getComponent('xyx456'); // => undefined
   * ```
   *
   * @category Methods
   */
  getComponent(identifiers: PlainObject | string | number = {}) {
    const parent = this.getParent();

    let normalizedIdentifiers: PlainObject;

    if (typeof identifiers === 'string' || typeof identifiers === 'number') {
      normalizedIdentifiers = parent.normalizeIdentifierDescriptor(identifiers);
    } else {
      normalizedIdentifiers = identifiers;
    }

    if (parent.isDetached()) {
      return undefined;
    }

    for (const identifierAttribute of parent.prototype.getIdentifierAttributes()) {
      const name = identifierAttribute.getName();
      const value: IdentifierValue | undefined = normalizedIdentifiers[name];

      if (value === undefined) {
        continue;
      }

      const index = this._getIndex(name);

      let component = index[value];

      if (component === undefined) {
        continue;
      }

      if (!hasOwnProperty(index, value)) {
        // The component's class has been forked
        component = component.fork({componentClass: parent});
      }

      return component;
    }

    return undefined;
  }

  addComponent(component: Component) {
    if (component.isDetached()) {
      throw new Error(
        `Cannot add a detached component to the identity map (${component.describeComponent()})`
      );
    }

    for (const identifierAttribute of component.getIdentifierAttributes({
      setAttributesOnly: true
    })) {
      const name = identifierAttribute.getName();
      const value = identifierAttribute.getValue() as IdentifierValue;
      const index = this._getIndex(name);

      if (hasOwnProperty(index, value)) {
        throw new Error(
          `A component with the same identifier already exists (${index[value]
            .getAttribute(name)
            .describe()})`
        );
      }

      index[value] = component;
    }
  }

  updateComponent(
    component: Component,
    attributeName: string,
    {
      previousValue,
      newValue
    }: {previousValue: IdentifierValue | undefined; newValue: IdentifierValue | undefined}
  ) {
    if (component.isDetached()) {
      return;
    }

    if (newValue === previousValue) {
      return;
    }

    const index = this._getIndex(attributeName);

    if (previousValue !== undefined) {
      delete index[previousValue];
    }

    if (newValue !== undefined) {
      if (hasOwnProperty(index, newValue)) {
        throw new Error(
          `A component with the same identifier already exists (${component
            .getAttribute(attributeName)
            .describe()})`
        );
      }

      index[newValue] = component;
    }
  }

  removeComponent(component: Component) {
    if (component.isDetached()) {
      throw new Error(
        `Cannot remove a detached component from the identity map (${component.describeComponent()})`
      );
    }

    for (const identifierAttribute of component.getIdentifierAttributes({
      setAttributesOnly: true
    })) {
      const name = identifierAttribute.getName();
      const value = identifierAttribute.getValue() as IdentifierValue;
      const index = this._getIndex(name);
      delete index[value];
    }
  }

  getComponents() {
    const identityMap = this;

    return {
      *[Symbol.iterator]() {
        const yieldedComponents = new Set<Component>();

        const indexes = identityMap._getIndexes();

        for (const name in indexes) {
          const index = identityMap._getIndex(name);

          for (const value in index) {
            const component = identityMap.getComponent({[name]: value});

            if (component === undefined || yieldedComponents.has(component)) {
              continue;
            }

            yield component;

            yieldedComponents.add(component);
          }
        }
      }
    };
  }

  // === Indexes ===

  _getIndex(name: string) {
    const indexes = this._getIndexes();

    if (!indexes[name]) {
      indexes[name] = Object.create(null);
    } else if (!hasOwnProperty(indexes, name)) {
      indexes[name] = Object.create(indexes[name]);
    }

    return indexes[name];
  }

  _indexes!: {[name: string]: {[value: string]: Component}};

  _getIndexes() {
    if (!this._indexes) {
      this._indexes = Object.create(null);
    } else if (!hasOwnProperty(this, '_indexes')) {
      this._indexes = Object.create(this._indexes);
    }

    return this._indexes;
  }
}

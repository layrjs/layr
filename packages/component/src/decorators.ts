import {hasOwnProperty, getPropertyDescriptor} from 'core-helpers';

import {Component} from './component';
import {
  Property,
  Attribute,
  AttributeOptions,
  PrimaryIdentifierAttribute,
  SecondaryIdentifierAttribute,
  Method,
  MethodOptions,
  PropertyExposure
} from './properties';
import {isComponentClassOrInstance, isComponentClass, isComponentInstance} from './utilities';
import {
  getConstructorSourceCode,
  getAttributeInitializerFromConstructorSourceCode
} from './js-parser';

type AttributeDecoratorOptions = Omit<AttributeOptions, 'value' | 'default'>;

/**
 * Decorates an attribute of a component so it can be type checked at runtime, validated, serialized, etc.
 *
 * @param [valueType] A string specifying the [type of values](https://liaison.dev/docs/v1/reference/value-type#supported-types) that can be stored in the attribute (default: `'any'`).
 * @param [options] The options to create the [`Attribute`](https://liaison.dev/docs/v1/reference/attribute#constructor).
 *
 * @example
 * ```
 * // JS
 *
 * import {Component, attribute, validators} from '﹫liaison/component';
 *
 * const {maxLength} = validators;
 *
 * class Movie extends Component {
 *   // Optional 'string' class attribute
 *   ﹫attribute('string?') static customName;
 *
 *   // Required 'string' instance attribute
 *   ﹫attribute('string') title;
 *
 *   // Optional 'string' instance attribute with a validator
 *   ﹫attribute('string?', {validators: [maxLength(100)]}) summary;
 *
 *   // Required array of 'Actor' instance attribute with a default value
 *   ﹫attribute('Actor[]') actors = [];
 * }
 * ```
 *
 * @example
 * ```
 * // TS
 *
 * import {Component, attribute, validators} from '﹫liaison/component';
 *
 * const {maxLength} = validators;
 *
 * class Movie extends Component {
 *   // Optional 'string' class attribute
 *   ﹫attribute('string?') static customName?: string;
 *
 *   // Required 'string' instance attribute
 *   ﹫attribute('string') title!: string;
 *
 *   // Optional 'string' instance attribute with a validator
 *   ﹫attribute('string?', {validators: [maxLength(100)]}) summary?: string;
 *
 *   // Required array of 'Actor' instance attribute with a default value
 *   ﹫attribute('Actor[]') actors: Actor[] = [];
 * }
 * ```
 *
 * @category Decorators
 * @decorator
 */
export function attribute(
  valueType?: string,
  options?: AttributeDecoratorOptions
): PropertyDecorator;
export function attribute(options?: AttributeDecoratorOptions): PropertyDecorator;
export function attribute(
  valueType?: string | AttributeDecoratorOptions,
  options?: AttributeDecoratorOptions
) {
  return createAttributeDecorator(
    new Map([[isComponentClassOrInstance, Attribute]]),
    'attribute',
    valueType,
    options
  );
}

/**
 * Decorates an attribute of a component as a [primary identifier attribute](https://liaison.dev/docs/v1/reference/primary-identifier-attribute).
 *
 * @param [valueType] A string specifying the type of values the attribute can store. It can be either `'string'` or `'number'` (default: `'string'`).
 * @param [options] The options to create the [`PrimaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/primary-identifier-attribute).
 *
 * @example
 * ```
 * // JS
 *
 * import {Component, primaryIdentifier} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   // Auto-generated 'string' primary identifier attribute
 *   ﹫primaryIdentifier('string') id;
 * }

 * class Film extends Component {
 *   // Custom 'number' primary identifier attribute
 *   ﹫primaryIdentifier('number', {default() { return Math.random(); }}) id;
 * }
 * ```
 *
 * @example
 * ```
 * // TS
 *
 * import {Component, primaryIdentifier} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   // Auto-generated 'string' primary identifier attribute
 *   ﹫primaryIdentifier('string') id!: string;
 * }

 * class Film extends Component {
 *   // Custom 'number' primary identifier attribute
 *   ﹫primaryIdentifier('number', {default() { return Math.random(); }}) id!: number;
 * }
 * ```
 *
 * @category Decorators
 * @decorator
 */
export function primaryIdentifier(
  valueType?: string,
  options?: AttributeDecoratorOptions
): PropertyDecorator;
export function primaryIdentifier(options?: AttributeDecoratorOptions): PropertyDecorator;
export function primaryIdentifier(
  valueType?: string | AttributeDecoratorOptions,
  options?: AttributeDecoratorOptions
) {
  return createAttributeDecorator(
    new Map([[isComponentInstance, PrimaryIdentifierAttribute]]),
    'primaryIdentifier',
    valueType,
    options
  );
}

/**
 * Decorates an attribute of a component as a [secondary identifier attribute](https://liaison.dev/docs/v1/reference/secondary-identifier-attribute).
 *
 * @param [valueType] A string specifying the type of values the attribute can store. It can be either `'string'` or `'number'` (default: `'string'`).
 * @param [options] The options to create the [`SecondaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/secondary-identifier-attribute).
 *
 * @example
 * ```
 * // JS
 *
 * import {Component, secondaryIdentifier} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   // 'string' secondary identifier attribute
 *   ﹫secondaryIdentifier('string') slug;
 *
 *   // 'number' secondary identifier attribute
 *   ﹫secondaryIdentifier('number') reference;
 * }
 * ```
 *
 * @example
 * ```
 * // TS
 *
 * import {Component, secondaryIdentifier} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   // 'string' secondary identifier attribute
 *   ﹫secondaryIdentifier('string') slug!: string;
 *
 *   // 'number' secondary identifier attribute
 *   ﹫secondaryIdentifier('number') reference!: number;
 * }
 * ```
 *
 * @category Decorators
 * @decorator
 */
export function secondaryIdentifier(
  valueType?: string,
  options?: AttributeDecoratorOptions
): PropertyDecorator;
export function secondaryIdentifier(options?: AttributeDecoratorOptions): PropertyDecorator;
export function secondaryIdentifier(
  valueType?: string | AttributeDecoratorOptions,
  options?: AttributeDecoratorOptions
) {
  return createAttributeDecorator(
    new Map([[isComponentInstance, SecondaryIdentifierAttribute]]),
    'secondaryIdentifier',
    valueType,
    options
  );
}

export function createAttributeDecorator(
  AttributeClassMap: PropertyClassMap,
  decoratorName: string,
  valueType?: string | AttributeDecoratorOptions,
  options: AttributeDecoratorOptions = {}
) {
  if (typeof valueType === 'string') {
    options = {...options, valueType};
  } else if (valueType !== undefined) {
    options = valueType;
  }

  if ('value' in options || 'default' in options) {
    throw new Error(`The options 'value' and 'default' are not authorized in @${decoratorName}()`);
  }

  let attributeOptions: AttributeOptions = options;

  return function (
    target: typeof Component | Component,
    name: string,
    descriptor?: PropertyDescriptor
  ) {
    if (!isComponentClassOrInstance(target)) {
      throw new Error(
        `@${decoratorName}() must be used inside a component class (property: '${name}')`
      );
    }

    if (isComponentClass(target)) {
      const value = (target as any)[name];
      attributeOptions = {value, ...attributeOptions};
    } else {
      const initializer = getAttributeInitializer(target, name, descriptor);
      if (initializer !== undefined) {
        attributeOptions = {default: initializer, ...attributeOptions};
      }
    }

    const AttributeClass = getPropertyClass(AttributeClassMap, target, {
      decoratorName,
      propertyName: name
    });

    const attribute = target.setProperty(name, AttributeClass, attributeOptions) as Attribute;

    const compiler = determineCompiler(descriptor);

    if (compiler === 'typescript' && 'default' in attributeOptions) {
      if (attribute._isDefaultSetInConstructor) {
        throw new Error(
          `Cannot set a default value to an attribute that already has an inherited default value (property: '${name}')`
        );
      }

      attribute._isDefaultSetInConstructor = true;
    }

    if (compiler === 'babel-legacy') {
      return getPropertyDescriptor(target, name) as void;
    }
  };
}

function getAttributeInitializer(
  component: Component,
  attributeName: string,
  descriptor?: PropertyDescriptor & {initializer?: any}
) {
  if (determineCompiler(descriptor) === 'babel-legacy') {
    return typeof descriptor!.initializer === 'function' ? descriptor!.initializer : undefined;
  }

  if (!hasOwnProperty(component, '__constructorSourceCode')) {
    const classSourceCode = component.constructor.toString();
    const constructorSourceCode = getConstructorSourceCode(classSourceCode);
    Object.defineProperty(component, '__constructorSourceCode', {value: constructorSourceCode});
  }

  const constructorSourceCode = component.__constructorSourceCode;

  if (constructorSourceCode === undefined) {
    return undefined;
  }

  return getAttributeInitializerFromConstructorSourceCode(constructorSourceCode, attributeName);
}

/**
 * Decorates a method of a component so it can be exposed and called remotely.
 *
 * @param [options] The options to create the [`Method`](https://liaison.dev/docs/v1/reference/method#constructor).
 *
 * @example
 * ```
 * import {Component, method} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   // Class method
 *   ﹫method() static getConfig() {
 *     // ...
 *   }
 *
 *   // Instance method
 *   ﹫method() play() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @category Decorators
 * @decorator
 */
export function method(options: MethodOptions = {}) {
  return createMethodDecorator(new Map([[isComponentClassOrInstance, Method]]), 'method', options);
}

export function createMethodDecorator(
  MethodClassMap: PropertyClassMap,
  decoratorName: string,
  options: MethodOptions = {}
) {
  return function (
    target: typeof Component | Component,
    name: string,
    descriptor: PropertyDescriptor
  ) {
    if (!isComponentClassOrInstance(target)) {
      throw new Error(
        `@${decoratorName}() must be used inside a component class (property: '${name}')`
      );
    }

    if (!(typeof descriptor.value === 'function' && descriptor.enumerable === false)) {
      throw new Error(
        `@${decoratorName}() must be used with a method declaration (property: '${name}')`
      );
    }

    const MethodClass = getPropertyClass(MethodClassMap, target, {
      decoratorName,
      propertyName: name
    });

    target.setProperty(name, MethodClass, options);
  };
}

type PropertyClassMap = Map<(value: any) => boolean, typeof Property>;

function getPropertyClass(
  propertyClassMap: PropertyClassMap,
  target: typeof Component | Component,
  {decoratorName, propertyName}: {decoratorName: string; propertyName: string}
) {
  for (const [func, propertyClass] of propertyClassMap.entries()) {
    if (func(target)) {
      return propertyClass;
    }
  }

  throw new Error(
    `Couldn't find a property class while executing @${decoratorName}() (${target.describeComponent()}, property: '${propertyName}')`
  );
}

type ClassExposure = {
  [name: string]: PropertyExposure | {[name: string]: PropertyExposure};
};

/**
 * Exposes some attributes or methods of a component so they can be consumed remotely.
 *
 * This decorator is usually placed before a component attribute or method, but it can also be placed before a component class. When placed before a component class, you can expose several attributes or methods at once, and even better, you can expose attributes or methods that are defined in a parent class.
 *
 * @param exposure An object specifying which operations should be exposed. When the decorator is placed before a component attribute or method, the object is of type [`PropertyExposure`](https://liaison.dev/docs/v1/reference/property#property-exposure-type). When the decorator is placed before a component class, the shape of the object is `{[propertyName]: PropertyExposure, prototype: {[propertyName]: PropertyExposure}}`.
 *
 * @example
 * ```
 * // JS
 *
 * import {Component, expose, attribute, method} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   // Class attribute exposing the 'get' operation only
 *   ﹫expose({get: true}) ﹫attribute('string?') static customName;
 *
 *   // Instance attribute exposing the 'get' and 'set' operations
 *   ﹫expose({get: true, set: true}) ﹫attribute('string') title;
 *
 *   // Class method exposure
 *   ﹫expose({call: true}) ﹫method() static getConfig() {
 *     // ...
 *   }
 *
 *   // Instance method exposure
 *   ﹫expose({call: true}) ﹫method() play() {
 *     // ...
 *   }
 * }
 *
 * // Exposing some class and instance methods that are defined in a parent class
 * ﹫expose({find: {call: true}, prototype: {load: {call: true}}})
 * class Actor extends Storable(Component) {
 *   // ...
 * }
 * ```
 *
 * @example
 * ```
 * // TS
 *
 * import {Component, expose, attribute, method} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   // Class attribute exposing the 'get' operation only
 *   ﹫expose({get: true}) ﹫attribute('string?') static customName?: string;
 *
 *   // Instance attribute exposing the 'get' and 'set' operations
 *   ﹫expose({get: true, set: true}) ﹫attribute('string') title!: string;
 *
 *   // Class method exposure
 *   ﹫expose({call: true}) ﹫method() static getConfig() {
 *     // ...
 *   }
 *
 *   // Instance method exposure
 *   ﹫expose({call: true}) ﹫method() play() {
 *     // ...
 *   }
 * }
 *
 * // Exposing some class and instance methods that are defined in a parent class
 * ﹫expose({find: {call: true}, prototype: {load: {call: true}}})
 * class Actor extends Storable(Component) {
 *   // ...
 * }
 * ```
 *
 * @category Decorators
 * @decorator
 */
export function expose(exposure: ClassExposure): (target: typeof Component | Component) => void;
export function expose(
  exposure: PropertyExposure
): (target: typeof Component | Component, name: string) => void;
export function expose(exposure: ClassExposure | PropertyExposure = {}) {
  return function (target: typeof Component | Component, name?: string) {
    if (name === undefined) {
      // Class decorator

      if (!isComponentClass(target)) {
        throw new Error(
          `@expose() must be used as a component class decorator or a component property decorator`
        );
      }

      const _expose = (
        target: typeof Component | Component,
        exposures: {[name: string]: PropertyExposure}
      ) => {
        for (const [name, exposure] of Object.entries(exposures)) {
          target.getProperty(name).setExposure(exposure);
        }
      };

      const {prototype: prototypeExposure, ...classExposure} = exposure as ClassExposure;

      _expose(target, classExposure);

      if (prototypeExposure !== undefined) {
        _expose(target.prototype, prototypeExposure as {[name: string]: PropertyExposure});
      }

      return;
    }

    // Property decorator

    if (!isComponentClassOrInstance(target)) {
      throw new Error(
        `@expose() must be as a component class decorator or a component property decorator (property: '${name}')`
      );
    }

    if (
      !target.hasProperty(name) ||
      target.getProperty(name, {autoFork: false}).getParent() !== target
    ) {
      throw new Error(
        `@expose() must be used in combination with @attribute() or @method() (property: '${name}')`
      );
    }

    target.getProperty(name).setExposure(exposure);
  };
}

/**
 * Provides a component so it can be easily accessed from the current component or from any component that is "consuming" it using the [`@consume()`](https://liaison.dev/docs/v1/reference/component#consume-decorator) decorator.
 *
 * @example
 * ```
 * // JS
 *
 * import {Component, provide, consume} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   ﹫consume() static Actor;
 * }
 *
 * class Actor extends Component {}
 *
 * class Backend extends Component {
 *   ﹫provide() static Movie = Movie;
 *   ﹫provide() static Actor = Actor;
 * }
 *
 * // Since `Actor` is provided by `Backend`, it can be accessed from `Movie`
 * Movie.Actor; // => Actor
 * ```
 *
 * @example
 * ```
 * // TS
 *
 * import {Component, provide, consume} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   ﹫consume() static Actor: typeof Actor;
 * }
 *
 * class Actor extends Component {}
 *
 * class Backend extends Component {
 *   ﹫provide() static Movie = Movie;
 *   ﹫provide() static Actor = Actor;
 * }
 *
 * // Since `Actor` is provided by `Backend`, it can be accessed from `Movie`
 * Movie.Actor; // => Actor
 * ```
 *
 * @category Decorators
 * @decorator
 */
export function provide() {
  return function (target: typeof Component, name: string, descriptor?: PropertyDescriptor) {
    if (!isComponentClass(target)) {
      throw new Error(
        `@provide() must be used inside a component class with as static attribute declaration (attribute: '${name}')`
      );
    }

    const compiler = determineCompiler(descriptor);

    const component = Object.getOwnPropertyDescriptor(target, name)?.value;

    if (!isComponentClass(component)) {
      throw new Error(
        `@provide() must be used with an attribute declaration specifying a component class (attribute: '${name}')`
      );
    }

    target.provideComponent(component);

    if (compiler === 'babel-legacy') {
      return getPropertyDescriptor(target, name) as void;
    }
  };
}

/**
 * Consumes a component provided by the provider (or recursively, any provider's provider) of the current component so it can be easily accessed using a component accessor.
 *
 * **Example:**
 *
 * See [@provide()'s example](https://liaison.dev/docs/v1/reference/component#provide-decorator).
 *
 * @category Decorators
 * @decorator
 */
export function consume() {
  return function (target: typeof Component, name: string, descriptor?: PropertyDescriptor) {
    if (!isComponentClass(target)) {
      throw new Error(
        `@consume() must be used inside a component class with as static attribute declaration (attribute: '${name}')`
      );
    }

    const compiler = determineCompiler(descriptor);

    if (hasOwnProperty(target, name)) {
      const propertyValue = (target as any)[name];

      if (propertyValue !== undefined) {
        throw new Error(
          `@consume() must be used with an attribute declaration which does not specify any value (attribute: '${name}')`
        );
      }

      if (compiler === 'babel-legacy') {
        delete (target as any)[name];
      }
    }

    target.consumeComponent(name);

    if (compiler === 'babel-legacy') {
      return getPropertyDescriptor(target, name) as void;
    }
  };
}

export function determineCompiler(descriptor: PropertyDescriptor | undefined) {
  if (typeof descriptor === 'object') {
    // The class has been compiled by Babel using @babel/plugin-proposal-decorators in legacy mode
    return 'babel-legacy';
  } else {
    // The class has been compiled by the TypeScript compiler
    return 'typescript';
  }
}

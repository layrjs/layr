import {hasOwnProperty} from 'core-helpers';

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

    if ('default' in attributeOptions) {
      if (attribute._isDefaultFromConstructor) {
        throw new Error(
          `Cannot set a default value to an attribute that already has an inherited default value (property: '${name}')`
        );
      }

      attribute._isDefaultFromConstructor = true;
    }

    if (determineCompiler(descriptor) === 'babel-legacy') {
      return Object.getOwnPropertyDescriptor(target, name) as void;
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

export function provide() {
  return function (target: typeof Component, name: string) {
    if (!isComponentClass(target)) {
      throw new Error(
        `@provide() must be used inside a component class with as static attribute declaration (attribute: '${name}')`
      );
    }

    const descriptor = Object.getOwnPropertyDescriptor(target, name);
    const component = descriptor?.value;

    if (!isComponentClass(component)) {
      throw new Error(
        `@provide() must be used with an attribute declaration specifying a component class (attribute: '${name}')`
      );
    }

    target.provideComponent(component);
  };
}

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
      return Object.getOwnPropertyDescriptor(target, name) as void;
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

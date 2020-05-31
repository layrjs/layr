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
import {isComponentClassOrInstance, isComponentClass, ensureComponentClass} from './utilities';
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
    new Map([[Component, Attribute]]),
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
    new Map([[Component, PrimaryIdentifierAttribute]]),
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
    new Map([[Component, SecondaryIdentifierAttribute]]),
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

  return function (target: typeof Component | Component, name: string) {
    if (!isComponentClassOrInstance(target)) {
      throw new Error(
        `@${decoratorName}() must be used inside a component class (property: '${name}')`
      );
    }

    if (isComponentClass(target)) {
      const value = (target as any)[name];
      attributeOptions = {value, ...attributeOptions};
    } else {
      const initializer = getAttributeInitializer(target, name);
      if (initializer !== undefined) {
        attributeOptions = {default: initializer, ...attributeOptions};
      }
    }

    const AttributeClass = getPropertyClass(AttributeClassMap, target);

    const attribute = target.setProperty(name, AttributeClass, attributeOptions) as Attribute;

    if ('default' in attributeOptions) {
      if (attribute._isDefaultFromConstructor) {
        throw new Error(
          `Cannot set a default value to an attribute that already has an inherited default value (property: '${name}')`
        );
      }

      attribute._isDefaultFromConstructor = true;
    }
  };
}

function getAttributeInitializer(component: Component, attributeName: string) {
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
  return createMethodDecorator(new Map([[Component, Method]]), 'method', options);
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

    const MethodClass = getPropertyClass(MethodClassMap, target);

    target.setProperty(name, MethodClass, options);
  };
}

type PropertyClassMap = Map<typeof Component, typeof Property>;

function getPropertyClass(
  propertyClassMap: PropertyClassMap,
  target: typeof Component | Component
) {
  target = ensureComponentClass(target);

  for (const [componentClass, propertyClass] of propertyClassMap.entries()) {
    if (target.isForkOf(componentClass)) {
      return propertyClass;
    }
  }

  throw new Error(
    `Couldn't find a property class for the component '${target.describeComponent()}'`
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
  return function (target: typeof Component, name: string) {
    if (!isComponentClass(target)) {
      throw new Error(
        `@consume() must be used inside a component class with as static attribute declaration (attribute: '${name}')`
      );
    }

    if (hasOwnProperty(target, name)) {
      throw new Error(
        `@consume() must be used with an attribute declaration which doesn't specify any value (attribute: '${name}')`
      );
    }

    target.consumeComponent(name);
  };
}

// export function inherit() {
//   return function (target, name, descriptor) {
//     ow(target, 'target', ow.object);
//     ow(name, 'name', ow.string.nonEmpty);
//     ow(descriptor, 'descriptor', ow.object);

//     if (!isWithProperties(target)) {
//       throw new Error(
//         `@inherit() target doesn't inherit from WithProperties (property name: '${name}')`
//       );
//     }

//     const property = target.getProperty(name, {throwIfMissing: false, autoFork: false});

//     if (property === undefined) {
//       throw new Error(
//         `@inherit() cannot be used with the property '${name}' which is missing in the parent class`
//       );
//     }

//     if (typeof target === 'function' && isAttribute(property) && property.getParent() === target) {
//       // If the target is a component class and the inherited property is an attribute,
//       // we must roll back the attribute declaration that has reinitialized the value
//       target.deleteProperty(name);
//     }

//     descriptor = getInheritedPropertyDescriptor(target, name);

//     return {...descriptor, __decoratedBy: '@inherit()'};
//   };
// }

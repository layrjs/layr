import {hasOwnProperty} from 'core-helpers';

import type {Component} from './component';
import {Attribute, AttributeOptions, Method, MethodOptions} from './properties';
import {isComponentClassOrInstance, isComponentClass} from './utilities';
import {
  getConstructorSourceCode,
  getAttributeInitializerFromConstructorSourceCode
} from './js-parser';

// export function property(options = {}) {
//   ow(options, 'options', ow.object);

//   return function(target, name, descriptor) {
//     ow(target, 'target', ow.object);
//     ow(name, 'name', ow.string.nonEmpty);
//     ow(descriptor, 'descriptor', ow.object);

//     if (!isWithProperties(target)) {
//       throw new Error(
//         `@property() target doesn't inherit from WithProperties (property name: '${name}')`
//       );
//     }

//     if (typeof descriptor.value === 'function' && descriptor.enumerable === false) {
//       return method(options)(target, name, descriptor);
//     }

//     return attribute(options)(target, name, descriptor);
//   };
// }

type AttributeDecoratorOptions = Omit<AttributeOptions, 'value' | 'default'>;

export function attribute(
  valueType?: string,
  options?: AttributeDecoratorOptions
): PropertyDecorator;
export function attribute(options?: AttributeDecoratorOptions): PropertyDecorator;
export function attribute(
  valueType?: string | AttributeDecoratorOptions,
  options: AttributeDecoratorOptions = {}
) {
  if (typeof valueType === 'string') {
    options.valueType = valueType;
  } else if (valueType !== undefined) {
    options = valueType;
  }

  if ('value' in options || 'default' in options) {
    throw new Error(`The options 'value' and 'default' are not authorized in $attribute()`);
  }

  let attributeOptions: AttributeOptions = {...options};

  return function (target: typeof Component | Component, name: string) {
    if (!isComponentClassOrInstance(target)) {
      throw new Error(`@attribute() must be used inside a component class (property: '${name}')`);
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

    target.setProperty(name, Attribute, attributeOptions);
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
  return function (
    target: typeof Component | Component,
    name: string,
    descriptor: PropertyDescriptor
  ) {
    if (!isComponentClassOrInstance(target)) {
      throw new Error(`@method() must be used inside a component class (property: '${name}')`);
    }

    if (!(typeof descriptor.value === 'function' && descriptor.enumerable === false)) {
      throw new Error(`@method() must be used with a method declaration (property: '${name}')`);
    }

    target.setProperty(name, Method, options);
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

// export function expose(exposure = {}) {
//   ow(exposure, 'exposure', ow.object);

//   return function (target, name, descriptor) {
//     ow(target, 'target', ow.object);
//     ow(name, 'name', ow.string.nonEmpty);
//     ow(descriptor, 'descriptor', ow.object);

//     if (!isWithProperties(target)) {
//       throw new Error(
//         `@expose() target doesn't inherit from WithProperties (property name: '${name}')`
//       );
//     }

//     const {__decoratedBy: decoratedBy} = descriptor;

//     if (
//       decoratedBy === '@attribute()' ||
//       decoratedBy === '@method()' ||
//       decoratedBy === '@inherit()'
//     ) {
//       // @expose() is used after @property(), @attribute(), @method(), or @inherit()
//       const property = target.getProperty(name);
//       property.setExposure(exposure);
//       return descriptor;
//     }

//     descriptor = property({exposure})(target, name, descriptor);

//     return descriptor;
//   };
// }

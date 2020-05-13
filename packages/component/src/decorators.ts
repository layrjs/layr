import {hasOwnProperty} from 'core-helpers';

import type {Component} from './component';
import {Attribute, AttributeOptions} from './attribute';
import {Method, MethodOptions} from './method';
import {isComponentClassOrInstance, isComponentClass} from './utilities';

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

export function attribute(options: AttributeOptions = {}) {
  return function (target: typeof Component | Component, name: string) {
    if (!isComponentClassOrInstance(target)) {
      throw new Error(`@attribute() must be used inside a component class (property: '${name}')`);
    }

    if (isComponentClass(target)) {
      if (
        target.hasAttribute(name) &&
        target.getAttribute(name, {autoFork: false}).getParent() === target
      ) {
        // If the attribute already exists in the target, it means it was forked from
        // the parent class as a side effect of the attribute declaration
        // In this case, the new value should have already been set and there is nothing more to do
      } else {
        // It is a new attribute or the attribute declaration didn't specify an initial value
        const initialValue = (target as any)[name];
        options = {value: initialValue, ...options};
      }
    }

    target.setProperty(name, Attribute, options);
  };
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

    const component = (target as any)[name];

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

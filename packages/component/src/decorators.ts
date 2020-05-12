// import {getInheritedPropertyDescriptor} from 'core-helpers';

import type {Component} from './component';
import {Attribute, AttributeOptions} from './attribute';
// import {Method} from './method';
import {isComponentClassOrInstance} from './utilities';

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
      throw new Error(
        `@attribute() target doesn't inherit from Component (property name: '${name}')`
      );
    }

    target.setProperty(name, Attribute, options);
  };
}

// export function method(options = {}) {
//   ow(options, 'options', ow.object);

//   return function (target, name, descriptor) {
//     ow(target, 'target', ow.object);
//     ow(name, 'name', ow.string.nonEmpty);
//     ow(descriptor, 'descriptor', ow.object);

//     if (!isWithProperties(target)) {
//       throw new Error(
//         `@method() target doesn't inherit from WithProperties (property name: '${name}')`
//       );
//     }

//     return _decorateMethod({target, name, descriptor, MethodClass: Method, options});
//   };
// }

// export function _decorateMethod({
//   target,
//   name,
//   descriptor,
//   MethodClass,
//   decoratorName = 'method',
//   options
// }) {
//   if (!(typeof descriptor.value === 'function' && descriptor.enumerable === false)) {
//     throw new Error(
//       `@${decoratorName}() cannot be used without a method declaration (property name: '${name}')`
//     );
//   }

//   target.setProperty(name, MethodClass, options);

//   return {...descriptor, __decoratedBy: '@method()'};
// }

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

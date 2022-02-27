import type {Component} from '../component';
import {Property, PropertyOptions, IntrospectedProperty} from './property';
import {isComponentClass} from '../utilities';

export type IntrospectedMethod = IntrospectedProperty;

export type MethodOptions = PropertyOptions & {
  schedule?: MethodScheduling;
  queue?: MethodQueueing;
  maximumDuration?: number;
};

export type MethodScheduling = {rate: number} | false;

export type MethodQueueing = boolean;

/**
 * *Inherits from [`Property`](https://layrjs.com/docs/v2/reference/property).*
 *
 * A `Method` represents a method of a [Component](https://layrjs.com/docs/v2/reference/component) class, prototype, or instance. It plays the role of a regular JavaScript method, but brings some extra features such as remote invocation, scheduled execution, or queuing.
 *
 * #### Usage
 *
 * Typically, you define a `Method` using the [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator) decorator.
 *
 * For example, here is how you would define a `Movie` class with some methods:
 *
 * ```
 * import {Component, method} from '﹫layr/component';
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
 * Then you can call a method like you would normally do with regular JavaScript:
 *
 * ```
 * Movie.getConfig();
 *
 * const movie = new Movie({title: 'Inception'});
 * movie.play();
 * ```
 *
 * So far, you may wonder what is the point of defining methods this way. By itself the [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator) decorator, except for creating a `Method` instance under the hood, doesn't provide much benefit.
 *
 * The trick is that since you have a `Method`, you also have a [`Property`](https://layrjs.com/docs/v2/reference/property) (because `Method` inherits from `Property`), and properties can be exposed to remote access thanks to the [`@expose()`](https://layrjs.com/docs/v2/reference/component#expose-decorator) decorator.
 *
 * So here is how you would expose the `Movie` methods:
 *
 * ```
 * import {Component, method} from '﹫layr/component';
 *
 * class Movie extends Component {
 *   // Exposed class method
 *   ﹫expose({call: true}) ﹫method() static getConfig() {
 *     // ...
 *   }
 *
 *   // Exposed instance method
 *   ﹫expose({call: true}) ﹫method() play() {
 *     // ...
 *   }
 * }
 * ```
 *
 * Now that you have some exposed methods, you can call them remotely in the same way you would do locally:
 *
 * ```
 * Movie.getConfig(); // Executed remotely
 *
 * const movie = new Movie({title: 'Inception'});
 * movie.play();  // Executed remotely
 * ```
 *
 * In addition, you can easily take advantage of some powerful features offered by [`Methods`](https://layrjs.com/docs/v2/reference/method). For example, here is how you would define a method that will be automatically executed every hour:
 *
 * ```
 * class Application extends Component {
 *   ﹫method({schedule: {rate: 60 * 60 * 1000}}) static async runHourlyTask() {
 *     // Do something every hour...
 *   }
 * }
 * ```
 *
 * And here is how you would define a method that will be executed in background with a maximum duration of 5 minutes:
 *
 * ```
 * class Email extends Component {
 *   ﹫method({queue: true, maximumDuration: 5 * 60 * 1000}) async send() {
 *     // Do something in background
 *   }
 * }
 * ```
 */
export class Method extends Property {
  _methodBrand!: void;

  /**
   * Creates an instance of [`Method`](https://layrjs.com/docs/v2/reference/method). Typically, instead of using this constructor, you would rather use the [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator) decorator.
   *
   * @param name The name of the method.
   * @param parent The component class, prototype, or instance that owns the method.
   * @param [options.exposure] A [`PropertyExposure`](https://layrjs.com/docs/v2/reference/property#property-exposure-type) object specifying how the method should be exposed to remote calls.
   * @param [options.schedule] A [`MethodScheduling`](https://layrjs.com/docs/v2/reference/method#method-scheduling-type) object specifying how the method should be scheduled for automatic execution. Note that only static methods can be scheduled.
   * @param [options.queue] A boolean specifying whether the method should be executed in background.
   * @param [options.maximumDuration] A number specifying the maximum duration of the method in milliseconds. Note that the actual duration of the method execution is not currently enforced. The purpose of this option is to help configuring the deployment of serverless functions. For example, in case of deployment to [AWS Lambda](https://aws.amazon.com/lambda/), this option will affect the `timeout` property of the generated Lambda function.
   *
   * @returns The [`Method`](https://layrjs.com/docs/v2/reference/method) instance that was created.
   *
   * @example
   * ```
   * import {Component, Method} from '﹫layr/component';
   *
   * class Movie extends Component {}
   *
   * const play = new Method('play', Movie.prototype, {exposure: {call: true}});
   *
   * play.getName(); // => 'play'
   * play.getParent(); // => Movie.prototype
   * play.getExposure(); // => {call: true}
   * ```
   *
   * @category Creation
   */
  constructor(name: string, parent: typeof Component | Component, options: MethodOptions = {}) {
    super(name, parent, options);
  }

  // === Options ===

  setOptions(options: MethodOptions = {}) {
    const {schedule, queue, maximumDuration, ...otherOptions} = options;

    super.setOptions(otherOptions);

    if (schedule !== undefined) {
      this.setScheduling(schedule);
    }

    if (queue !== undefined) {
      this.setQueueing(queue);
    }

    if (maximumDuration !== undefined) {
      this.setMaximumDuration(maximumDuration);
    }
  }

  // === Property Methods ===

  /**
   * See the methods that are inherited from the [`Property`](https://layrjs.com/docs/v2/reference/property#basic-methods) class.
   *
   * @category Methods
   */

  // === Scheduling ===

  _scheduling?: MethodScheduling;

  /**
   * If the method is scheduled for automatic execution, returns a [`MethodScheduling`](https://layrjs.com/docs/v2/reference/method#method-scheduling-type) object. Otherwise, returns `undefined`.
   *
   * @returns A [`MethodScheduling`](https://layrjs.com/docs/v2/reference/method#method-scheduling-type) object or `undefined`.
   *
   * @example
   * ```
   * runHourlyTaskMethod.getScheduling(); // => {rate: 60 * 60 * 1000}
   * regularMethod.getScheduling(); // => undefined
   * ```
   *
   * @category Scheduling
   */
  getScheduling() {
    return this._scheduling;
  }

  /**
   * Sets how the method should be scheduled for automatic execution. Note that only static methods can be scheduled.
   *
   * @param scheduling A [`MethodScheduling`](https://layrjs.com/docs/v2/reference/method#method-scheduling-type) object.
   *
   * @example
   * ```
   * runHourlyTaskMethod.setScheduling({rate: 60 * 60 * 1000});
   * ```
   *
   * @category Scheduling
   */
  setScheduling(scheduling: MethodScheduling | undefined) {
    if (!isComponentClass(this.getParent())) {
      throw new Error(`Only static methods can be scheduled (${this.describe()})`);
    }

    this._scheduling = scheduling;
  }

  /**
   * @typedef MethodScheduling
   *
   * A `MethodScheduling` is a plain object specifying how a method is scheduled for automatic execution. The shape of the object is `{rate: number}` where `rate` is the execution frequency expressed in milliseconds.
   *
   * @example
   * ```
   * {rate: 60 * 1000} // Every minute
   * {rate: 60 * 60 * 1000} // Every hour
   * {rate: 24 * 60 * 60 * 1000} // Every day
   * ```
   *
   * @category Scheduling
   */

  // === Queueing ===

  _queueing?: MethodQueueing;

  /**
   * Returns a boolean indicating whether the method should be executed in background.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * backgroundMethod.getQueueing(); // => true
   * regularMethod.getQueueing(); // => false
   * ```
   *
   * @category Queueing
   */
  getQueueing() {
    return this._queueing ?? false;
  }

  /**
   * Sets whether the method should be executed in background.
   *
   * @param queueing A boolean.
   *
   * @example
   * ```
   * backgroundMethod.setQueueing(true);
   * ```
   *
   * @category Queueing
   */
  setQueueing(queueing: MethodQueueing | undefined) {
    this._queueing = queueing;
  }

  // === Maximum Duration ===

  _maximumDuration?: number;

  /**
   * Returns a number representing the maximum duration of the method in milliseconds or `undefined` if the method has no maximum duration.
   *
   * @returns A number or `undefined`.
   *
   * @example
   * ```
   * backgroundMethod.getMaximumDuration(); // => 5 * 60 * 1000 (5 minutes)
   * regularMethod.getMaximumDuration(); // => undefined
   * ```
   *
   * @category Maximum Duration
   */
  getMaximumDuration() {
    return this._maximumDuration;
  }

  /**
   * Sets the maximum duration of the method in milliseconds. Alternatively, you can pass `undefined` to indicate that the method has no maximum duration.
   *
   * @param maximumDuration A number or `undefined`.
   *
   * @example
   * ```
   * backgroundMethod.setMaximumDuration(5 * 60 * 1000); // 5 minutes
   * ```
   *
   * @category Maximum Duration
   */
  setMaximumDuration(maximumDuration: number | undefined) {
    this._maximumDuration = maximumDuration;
  }

  // === Utilities ===

  static isMethod(value: any): value is Method {
    return isMethodInstance(value);
  }

  describeType() {
    return 'method';
  }
}

/**
 * Returns whether the specified value is a `Method` class.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isMethodClass(value: any): value is typeof Method {
  return typeof value?.isMethod === 'function';
}

/**
 * Returns whether the specified value is a `Method` instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isMethodInstance(value: any): value is Method {
  return isMethodClass(value?.constructor) === true;
}

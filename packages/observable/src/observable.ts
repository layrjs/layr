import {hasOwnProperty, Constructor, isClass, getTypeOf, isPlainObject} from 'core-helpers';

export type ObservableType = {
  addObserver(observer: Observer): void;
  removeObserver(observer: Observer): void;
  callObservers(...args: any[]): void;
  isObservable(value: any): boolean;
};

export type Observer = ObserverFunction | ObservableType;

export type ObserverFunction = (...args: any[]) => void;

export type ObserverPayload = {[key: string]: unknown};

/**
 * Brings observability to any class.
 *
 * This mixin is used to construct several Layr's classes such as [`Component`](https://layrjs.com/docs/v1/reference/component) or [`Attribute`](https://layrjs.com/docs/v1/reference/attribute). So, in most cases, you'll have the capabilities provided by this mixin without having to call it.
 *
 * #### Usage
 *
 * Call the `Observable()` mixin with any class to construct an [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class) class. Then, you can add some observers by using the [`addObserver()`](https://layrjs.com/docs/v1/reference/observable#add-observer-dual-method) method, and trigger their execution anytime by using the [`callObservers()`](https://layrjs.com/docs/v1/reference/observable#call-observers-dual-method) method.
 *
 * For example, let's define a `Movie` class using the `Observable()` mixin:
 *
 * ```
 * // JS
 *
 * import {Observable} from '@layr/observable';
 *
 * class Movie extends Observable(Object) {
 *   get title() {
 *     return this._title;
 *   }
 *
 *   set title(title) {
 *     this._title = title;
 *     this.callObservers();
 *   }
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Observable} from '@layr/observable';
 *
 * class Movie extends Observable(Object) {
 *   _title?: string;
 *
 *   get title() {
 *     return this._title;
 *   }
 *
 *   set title(title: string) {
 *     this._title = title;
 *     this.callObservers();
 *   }
 * }
 * ```
 *
 * Next, we can create a `Movie` instance, and observe it:
 *
 * ```
 * const movie = new Movie();
 *
 * movie.addObserver(() => {
 *   console.log('The movie's title has changed');
 * })
 * ```
 *
 * And now, every time we change the title of `movie`, its observer will be automatically executed:
 *
 * ```
 * movie.title = 'Inception';
 *
 * // Should display:
 * // 'The movie's title has changed'
 * ```
 *
 * > Note that the same result could have been achieved by using a Layr [`Component`](https://layrjs.com/docs/v1/reference/component):
 * >
 * > ```
 * > // JS
 * >
 * > import {Component, attribute} from '@layr/component';
 * >
 * > class Movie extends Component {
 * >   @attribute('string?') title;
 * > }
 * > ```
 * >
 * > ```
 * > // TS
 * >
 * > import {Component, attribute} from '@layr/component';
 * >
 * > class Movie extends Component {
 * >   @attribute('string?') title?: string;
 * > }
 * > ```
 *
 * ### Observable <badge type="primary">class</badge> {#observable-class}
 *
 * An `Observable` class is constructed by calling the `Observable()` mixin ([see above](https://layrjs.com/docs/v1/reference/observable#observable-mixin)).
 * @mixin
 */
export function Observable<T extends Constructor>(Base: T) {
  if (!isClass(Base)) {
    throw new Error(
      `The Observable mixin should be applied on a class (received type: '${getTypeOf(Base)}')`
    );
  }

  if (typeof (Base as any).isObservable === 'function') {
    return Base as T & typeof Observable;
  }

  const Observable = class extends Base {
    /**
     * Adds an observer to the current class or instance.
     *
     * @param observer A function that will be automatically executed when the [`callObservers()`](https://layrjs.com/docs/v1/reference/observable#call-observers-dual-method) method is called. Alternatively, you can specify an observable for which the observers should be executed, and doing so, you can connect an observable to another observable.
     *
     * @example
     * ```
     * Movie.addObserver(() => {
     *   // A `Movie` class observer
     * });
     *
     * const movie = new Movie();
     *
     * movie.addObserver(() => {
     *   // A `Movie` instance observer
     * });
     *
     * const actor = new Actor();
     *
     * // Connect `actor` to `movie` so that when `callObservers()` is called on `actor`,
     * // then `callObservers()` is automatically called on `movie`
     * actor.addObserver(movie);
     * ```
     *
     * @category Methods
     */
    static get addObserver() {
      return this.prototype.addObserver;
    }

    /**
     * Adds an observer to the current class or instance.
     *
     * @param observer A function that will be automatically executed when the [`callObservers()`](https://layrjs.com/docs/v1/reference/observable#call-observers-dual-method) method is called. Alternatively, you can specify an observable for which the observers should be executed, and doing so, you can connect an observable to another observable.
     *
     * @example
     * ```
     * Movie.addObserver(() => {
     *   // A `Movie` class observer
     * });
     *
     * const movie = new Movie();
     *
     * movie.addObserver(() => {
     *   // A `Movie` instance observer
     * });
     *
     * const actor = new Actor();
     *
     * // Connect `actor` to `movie` so that when `callObservers()` is called on `actor`,
     * // then `callObservers()` is automatically called on `movie`
     * actor.addObserver(movie);
     * ```
     *
     * @category Methods
     */
    addObserver(observer: Observer) {
      this.__getObservers().add(observer);
    }

    /**
     * Removes an observer from the current class or instance.
     *
     * @param observer A function or a connected observable.
     *
     * @example
     * ```
     * const observer = () => {
     *   // ...
     * }
     *
     * // Add `observer` to the `Movie` class
     * Movie.addObserver(observer);
     *
     * // Remove `observer` from to the `Movie` class
     * Movie.removeObserver(observer);
     *
     * const movie = new Movie();
     * const actor = new Actor();
     *
     * // Connect `actor` to `movie`
     * actor.addObserver(movie);
     *
     * // Remove the connection between `actor` and `movie`
     * actor.removeObserver(movie);
     * ```
     *
     * @category Methods
     */
    static get removeObserver() {
      return this.prototype.removeObserver;
    }

    /**
     * Removes an observer from the current class or instance.
     *
     * @param observer A function or a connected observable.
     *
     * @example
     * ```
     * const observer = () => {
     *   // ...
     * }
     *
     * // Add `observer` to the `Movie` class
     * Movie.addObserver(observer);
     *
     * // Remove `observer` from to the `Movie` class
     * Movie.removeObserver(observer);
     *
     * const movie = new Movie();
     * const actor = new Actor();
     *
     * // Connect `actor` to `movie`
     * actor.addObserver(movie);
     *
     * // Remove the connection between `actor` and `movie`
     * actor.removeObserver(movie);
     * ```
     *
     * @category Methods
     */
    removeObserver(observer: Observer) {
      this.__getObservers().remove(observer);
    }

    /**
     * Calls the observers of the current class or instance.
     *
     * @param [payload] An optional object to pass to the observers when they are executed.
     *
     * @example
     * ```
     * const movie = new Movie();
     *
     * movie.addObserver((payload) => {
     *   console.log('Observer called with:', payload);
     * });
     *
     * movie.callObservers();
     *
     * // Should display:
     * // 'Observer called with: undefined'
     *
     * movie.callObservers({changes: ['title']});
     *
     * // Should display:
     * // 'Observer called with: {changes: ['title']}'
     * ```
     *
     * @category Methods
     */
    static get callObservers() {
      return this.prototype.callObservers;
    }

    /**
     * Calls the observers of the current class or instance.
     *
     * @param [payload] An optional object to pass to the observers when they are executed.
     *
     * @example
     * ```
     * const movie = new Movie();
     *
     * movie.addObserver((payload) => {
     *   console.log('Observer called with:', payload);
     * });
     *
     * movie.callObservers();
     *
     * // Should display:
     * // 'Observer called with: undefined'
     *
     * movie.callObservers({changes: ['title']});
     *
     * // Should display:
     * // 'Observer called with: {changes: ['title']}'
     * ```
     *
     * @category Methods
     */
    callObservers(payload?: ObserverPayload) {
      this.__getObservers().call(payload);
    }

    static __observers?: ObserverSet;

    __observers?: ObserverSet;

    static get __getObservers() {
      return this.prototype.__getObservers;
    }

    __getObservers() {
      if (!hasOwnProperty(this, '__observers')) {
        Object.defineProperty(this, '__observers', {value: new ObserverSet()});
      }

      return this.__observers!;
    }

    static get isObservable() {
      return this.prototype.isObservable;
    }

    isObservable(value: any): value is ObservableType {
      return isObservable(value);
    }
  };

  return Observable;
}

/**
 * Returns an observable from an existing object or array.
 *
 * The returned observable is observed deeply. So, for example, if an object contains a nested object, modifying the nested object will trigger the execution of the parent's observers.
 *
 * The returned observable provides the same methods as an [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class) instance:
 *
 * - [`addObserver()`](https://layrjs.com/docs/v1/reference/observable#add-observer-dual-method)
 * - [`removeObserver()`](https://layrjs.com/docs/v1/reference/observable#remove-observer-dual-method)
 * - [`callObservers()`](https://layrjs.com/docs/v1/reference/observable#call-observers-dual-method)
 *
 * @param target A JavaScript plain object or array that you want to observe.
 *
 * @returns An observable objet or array.
 *
 * @example
 * ```
 * import {createObservable} from '@layr/observable';
 *
 * // Create an observable `movie`
 * const movie = createObservable({
 *   title: 'Inception',
 *   genres: ['drama'],
 *   details: {duration: 120}
 * });
 *
 * // Add an observer
 * movie.addObserver(() => {
 *   // ...
 * });
 *
 * // Then, any of the following changes on `movie` will call the observer:
 * movie.title = 'Inception 2';
 * delete movie.title;
 * movie.year = 2010;
 * movie.genres.push('action');
 * movie.genres[1] = 'sci-fi';
 * movie.details.duration = 125;
 * ```
 *
 * @category Bringing Observability to an Object or an Array
 */
export function createObservable<T extends object>(target: T) {
  if (!canBeObserved(target)) {
    throw new Error(
      `Cannot create an observable from a target that is not an object, an array, or a function`
    );
  }

  if (isObservable(target)) {
    return target;
  }

  const observers = new ObserverSet();

  const handleAddObserver = function (observer: Observer) {
    observers.add(observer);
  };

  const handleRemoveObserver = function (observer: Observer) {
    observers.remove(observer);
  };

  const handleCallObservers = function (payload?: ObserverPayload) {
    observers.call(payload);
  };

  const handleIsObservable = function (value: any) {
    return isObservable(value);
  };

  let observable: T & ObservableType;

  const handler = {
    has(target: object, key: string | number | symbol) {
      if (
        key === 'addObserver' ||
        key === 'removeObserver' ||
        key === 'callObservers' ||
        key === 'isObservable'
      ) {
        return true;
      }

      return Reflect.has(target, key);
    },

    get(target: object, key: string | number | symbol, receiver?: any) {
      if (receiver === observable) {
        if (key === 'addObserver') {
          return handleAddObserver;
        }

        if (key === 'removeObserver') {
          return handleRemoveObserver;
        }

        if (key === 'callObservers') {
          return handleCallObservers;
        }

        if (key === 'isObservable') {
          return handleIsObservable;
        }
      }

      return Reflect.get(target, key, receiver);
    },

    set(target: object, key: string | number | symbol, newValue: any, receiver?: any) {
      if (
        key === 'addObserver' ||
        key === 'removeObserver' ||
        key === 'callObservers' ||
        key === 'isObservable'
      ) {
        throw new Error(
          `Cannot set a property named 'addObserver', 'removeObserver', 'callObservers' or 'isObservable' in an observed object`
        );
      }

      if (canBeObserved(newValue) && !isObservable(newValue) && isEmbeddable(newValue)) {
        newValue = createObservable(newValue);
      }

      const previousValue = Reflect.get(target, key, receiver);

      const result = Reflect.set(target, key, newValue, receiver);

      if (receiver === observable && newValue?.valueOf() !== previousValue?.valueOf()) {
        if (isObservable(previousValue) && isEmbeddable(previousValue)) {
          previousValue.removeObserver(handleCallObservers);
        }

        if (isObservable(newValue) && isEmbeddable(newValue)) {
          newValue.addObserver(handleCallObservers);
        }

        handleCallObservers();
      }

      return result;
    },

    deleteProperty(target: object, key: string | number | symbol) {
      if (
        key === 'addObserver' ||
        key === 'removeObserver' ||
        key === 'callObservers' ||
        key === 'isObservable'
      ) {
        throw new Error(
          `Cannot delete a property named 'addObserver', 'removeObserver', 'callObservers' or 'isObservable' in an observed object`
        );
      }

      const previousValue = Reflect.get(target, key);

      if (isObservable(previousValue) && isEmbeddable(previousValue)) {
        previousValue.removeObserver(handleCallObservers);
      }

      const result = Reflect.deleteProperty(target, key);

      handleCallObservers();

      return result;
    }
  };

  observable = new Proxy<T>(target, handler) as T & ObservableType;

  const observeExistingValue = function (key: string | number, value: unknown) {
    if (canBeObserved(value) && !isObservable(value) && isEmbeddable(value)) {
      value = createObservable(value);
      (target as any)[key] = value;
    }

    if (isObservable(value)) {
      value.addObserver(observable);
    }
  };

  if (Array.isArray(target)) {
    for (let index = 0; index < target.length; index++) {
      observeExistingValue(index, target[index]);
    }
  } else if (isPlainObject(target)) {
    for (const [key, value] of Object.entries(target)) {
      observeExistingValue(key, value);
    }
  }

  return observable;
}

export class ObserverSet {
  _observers: Observer[];

  constructor() {
    this._observers = [];
  }

  add(observer: Observer) {
    if (!(typeof observer === 'function' || isObservable(observer))) {
      throw new Error(`Cannot add an observer that is not a function or an observable`);
    }

    this._observers.push(observer);
  }

  remove(observer: Observer) {
    if (!(typeof observer === 'function' || isObservable(observer))) {
      throw new Error(`Cannot remove an observer that is not a function or an observable`);
    }

    const index = this._observers.indexOf(observer);

    if (index !== -1) {
      this._observers.splice(index, 1);
    }
  }

  call({
    _observerStack = new Set(),
    ...payload
  }: ObserverPayload & {_observerStack?: Set<Observer>} = {}) {
    for (const observer of this._observers) {
      if (_observerStack.has(observer)) {
        continue; // Avoid looping indefinitely when a circular reference is encountered
      }

      _observerStack.add(observer);

      try {
        if (isObservable(observer)) {
          observer.callObservers({_observerStack, ...payload});
        } else {
          observer({_observerStack, ...payload});
        }
      } finally {
        _observerStack.delete(observer);
      }
    }
  }
}

/**
 * Returns whether the specified value is observable. When a value is observable, you can use any the following methods on it: [`addObserver()`](https://layrjs.com/docs/v1/reference/observable#add-observer-dual-method), [`removeObserver()`](https://layrjs.com/docs/v1/reference/observable#remove-observer-dual-method), and [`callObservers()`](https://layrjs.com/docs/v1/reference/observable#call-observers-dual-method).
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isObservable(value: any): value is ObservableType {
  return typeof value?.isObservable === 'function';
}

export function canBeObserved(value: any): value is object {
  return (
    (typeof value === 'object' && value !== null && !(value instanceof Date)) ||
    typeof value === 'function'
  );
}

export function isEmbeddable(value: any) {
  const isEmbedded = value?.constructor?.isEmbedded;

  if (typeof isEmbedded === 'function' && isEmbedded() === false) {
    return false;
  }

  return true;
}

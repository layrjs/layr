import {hasOwnProperty, Constructor, isClass, getTypeOf} from 'core-helpers';

export type ObservableType = {
  addObserver(observer: Observer): void;
  removeObserver(observer: Observer): void;
  callObservers(...args: any[]): void;
  isObservable(value: any): boolean;
};

export type Observer = ObserverFunction | ObservableType;

export type ObserverFunction = (...args: any[]) => void;

export type ObserverStack = Set<Observer>;

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
    static get addObserver() {
      return this.prototype.addObserver;
    }

    addObserver(observer: Observer) {
      this.__getObservers().add(observer);
    }

    static get removeObserver() {
      return this.prototype.removeObserver;
    }

    removeObserver(observer: Observer) {
      this.__getObservers().remove(observer);
    }

    static get callObservers() {
      return this.prototype.callObservers;
    }

    callObservers({_observerStack}: {_observerStack?: ObserverStack} = {}) {
      this.__getObservers().call({_observerStack});
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

  const handleCallObservers = function ({_observerStack}: {_observerStack?: ObserverStack} = {}) {
    observers.call({_observerStack});
  };

  const handleIsObservable = function (value: any) {
    return isObservable(value);
  };

  let proxy: T & ObservableType;

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
      if (receiver === proxy) {
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

      const previousValue = Reflect.get(target, key, receiver);

      const result = Reflect.set(target, key, newValue, receiver);

      if (receiver === proxy && newValue?.valueOf() !== previousValue?.valueOf()) {
        if (isObservable(previousValue)) {
          previousValue.removeObserver(handleCallObservers);
        }

        if (isObservable(newValue)) {
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

      if (isObservable(previousValue)) {
        previousValue.removeObserver(handleCallObservers);
      }

      const result = Reflect.deleteProperty(target, key);

      handleCallObservers();

      return result;
    }
  };

  proxy = new Proxy<T>(target, handler) as T & ObservableType;

  return proxy;
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

  call({_observerStack = new Set()}: {_observerStack?: ObserverStack} = {}) {
    for (const observer of this._observers) {
      if (_observerStack.has(observer)) {
        continue; // Avoid looping indefinitely when a circular reference is encountered
      }

      _observerStack.add(observer);
      try {
        if (isObservable(observer)) {
          observer.callObservers({_observerStack});
        } else {
          observer({_observerStack});
        }
      } finally {
        _observerStack.delete(observer);
      }
    }
  }
}

export function isObservable(value: any): value is ObservableType {
  return typeof value?.isObservable === 'function';
}

export function canBeObserved(value: any): value is object {
  return (
    (typeof value === 'object' && value !== null && !(value instanceof Date)) ||
    typeof value === 'function'
  );
}

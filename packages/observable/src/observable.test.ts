import {
  Observable,
  createObservable,
  isObservable,
  canBeObserved,
  isEmbeddable,
  ObservableType
} from './observable';

describe('Observable', () => {
  describe('Observable array', () => {
    let originalArray: any[];
    let observableArray: any[] & ObservableType;

    beforeEach(() => {
      originalArray = [3, 2, 1];
      observableArray = createObservable(originalArray);
    });

    it('Should be an array', () => {
      expect(Array.isArray(originalArray)).toBe(true);
      expect(Array.isArray(observableArray)).toBe(true);
    });

    it('Should be an observable', () => {
      expect(isObservable(originalArray)).toBe(false);
      expect(isObservable(observableArray)).toBe(true);
    });

    it('Should be embeddable', () => {
      expect(isEmbeddable(observableArray)).toBe(true);
    });

    it('Should be usable as the target of a new observable', () => {
      const newObservableArray = createObservable(observableArray);
      expect(isObservable(newObservableArray)).toBe(true);
    });

    it('Should be equal to the original array', () => {
      expect(observableArray).toEqual(originalArray);
    });

    it('Should produce the same JSON as the original array', () => {
      expect(JSON.stringify(observableArray)).toBe(JSON.stringify(originalArray));
    });

    it('Should call observers when callObservers() is called', () => {
      const observer = jest.fn();
      observableArray.addObserver(observer);
      expect(observer).not.toHaveBeenCalled();
      observableArray.callObservers();
      expect(observer).toHaveBeenCalled();
    });

    it('Should call observers when changing an item', () => {
      const observer = jest.fn();
      observableArray.addObserver(observer);
      expect(observer).not.toHaveBeenCalled();
      observableArray[0] = 1;
      expect(observer).toHaveBeenCalled();
    });

    it('Should not call observers when setting an item with the same value', () => {
      const observer = jest.fn();
      observableArray.addObserver(observer);
      expect(observer).not.toHaveBeenCalled();
      observableArray[0] = 3;
      expect(observer).not.toHaveBeenCalled();
    });

    it('Should call observers when changing array length', () => {
      const observer = jest.fn();
      observableArray.addObserver(observer);
      expect(observer).not.toHaveBeenCalled();
      observableArray.length = 0;
      expect(observer).toHaveBeenCalled();
    });

    it(`Shouldn't call removed observers`, () => {
      const observer1 = jest.fn();
      observableArray.addObserver(observer1);

      const observer2 = jest.fn();
      observableArray.addObserver(observer2);

      observableArray[0] = 4;

      const numberOfCalls1 = observer1.mock.calls.length;
      const numberOfCalls2 = observer2.mock.calls.length;

      expect(numberOfCalls1).not.toBe(0);
      expect(numberOfCalls2).not.toBe(0);

      observableArray.removeObserver(observer1);

      observableArray[0] = 5;

      expect(observer1.mock.calls.length).toBe(numberOfCalls1);
      expect(observer2.mock.calls.length).not.toBe(numberOfCalls1);
    });

    describe('Observable item', () => {
      it('Should call observers when updating an observable item', () => {
        const observer = jest.fn();
        observableArray.addObserver(observer);

        expect(observer).toHaveBeenCalledTimes(0);

        const observableItem = createObservable([] as any[]);
        observableArray[0] = observableItem;

        expect(observer).toHaveBeenCalledTimes(1);

        observableItem[0] = 1;

        expect(observer).toHaveBeenCalledTimes(2);

        const observableItem2 = createObservable([] as any[]);
        observableArray.push(observableItem2);

        expect(observer).toHaveBeenCalledTimes(3);

        observableItem2[0] = 1;

        expect(observer).toHaveBeenCalledTimes(4);
      });

      it(`Should stop calling observers when an observable item has been removed`, () => {
        const observer = jest.fn();
        observableArray.addObserver(observer);

        expect(observer).toHaveBeenCalledTimes(0);

        const observableItem = createObservable([] as any[]);
        observableArray[3] = observableItem;

        expect(observer).toHaveBeenCalledTimes(1);

        observableItem[0] = 1;

        expect(observer).toHaveBeenCalledTimes(2);

        observableArray[3] = undefined;

        expect(observer).toHaveBeenCalledTimes(3);

        observableItem[0] = 2;

        expect(observer).toHaveBeenCalledTimes(3);

        observableArray[3] = observableItem;

        expect(observer).toHaveBeenCalledTimes(4);

        observableItem[0] = 3;

        expect(observer).toHaveBeenCalledTimes(5);

        observableArray.pop();

        expect(observer).toHaveBeenCalledTimes(7);

        observableItem[0] = 4;

        expect(observer).toHaveBeenCalledTimes(7);
      });

      it('Should observe existing items', () => {
        const observableArray = createObservable([createObservable([1])]);
        const observer = jest.fn();
        observableArray.addObserver(observer);

        expect(observer).toHaveBeenCalledTimes(0);

        observableArray[0][0] = 2;

        expect(observer).toHaveBeenCalledTimes(1);
      });

      it('Should make existing items observable when possible', () => {
        const observableArray = createObservable([[1]]);

        expect(isObservable(observableArray[0])).toBe(true);

        const observer = jest.fn();
        observableArray.addObserver(observer);

        expect(observer).toHaveBeenCalledTimes(0);

        observableArray[0][0] = 2;

        expect(observer).toHaveBeenCalledTimes(1);

        observableArray[0] = [3];

        expect(isObservable(observableArray[0])).toBe(true);

        expect(observer).toHaveBeenCalledTimes(2);

        observableArray[0][0] = 4;

        expect(observer).toHaveBeenCalledTimes(3);
      });
    });

    describe('Mutator methods', () => {
      it('Should call observers when using copyWithin()', () => {
        const observer = jest.fn();
        observableArray.addObserver(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.copyWithin(0, 1);
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using fill()', () => {
        const observer = jest.fn();
        observableArray.addObserver(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.fill(0);
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using pop()', () => {
        const observer = jest.fn();
        observableArray.addObserver(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.pop();
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using push()', () => {
        const observer = jest.fn();
        observableArray.addObserver(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.push(4);
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using reverse()', () => {
        const observer = jest.fn();
        observableArray.addObserver(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.reverse();
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using shift()', () => {
        const observer = jest.fn();
        observableArray.addObserver(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.shift();
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using sort()', () => {
        const observer = jest.fn();
        observableArray.addObserver(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.sort();
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using splice()', () => {
        const observer = jest.fn();
        observableArray.addObserver(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.splice(0, 1);
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using unshift()', () => {
        const observer = jest.fn();
        observableArray.addObserver(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.unshift(4);
        expect(observer).toHaveBeenCalled();
      });
    });
  });

  describe('Observable object', () => {
    let originalObject: {[key: string]: any};
    let observableObject: {[key: string]: any} & ObservableType;

    beforeEach(() => {
      originalObject = {
        id: 1
      };
      observableObject = createObservable(originalObject);
    });

    it('Should be an object', () => {
      expect(typeof originalObject).toEqual('object');
      expect(typeof observableObject).toEqual('object');
    });

    it('Should be an observable', () => {
      expect(isObservable(originalObject)).toBe(false);
      expect(isObservable(observableObject)).toBe(true);
    });

    it('Should be embeddable', () => {
      expect(isEmbeddable(observableObject)).toBe(true);
    });

    it('Should be usable as the target of a new observable', () => {
      const newCustomObservable = createObservable(observableObject);
      expect(isObservable(newCustomObservable)).toBe(true);
    });

    it('Should be equal to the original object', () => {
      expect(observableObject).toEqual(originalObject);
    });

    it('Should produce the same JSON as the original object', () => {
      expect(JSON.stringify(observableObject)).toBe(JSON.stringify(originalObject));
    });

    it('Should call observers when callObservers() is called', () => {
      const observer = jest.fn();
      observableObject.addObserver(observer);
      expect(observer).not.toHaveBeenCalled();
      observableObject.callObservers();
      expect(observer).toHaveBeenCalled();
    });

    it('Should call observers when changing an attribute', () => {
      const observer = jest.fn();
      observableObject.addObserver(observer);
      expect(observer).not.toHaveBeenCalled();
      observableObject.id = 2;
      expect(observer).toHaveBeenCalled();
    });

    it('Should not call observers when setting an attribute with the same value', () => {
      const observer = jest.fn();
      observableObject.addObserver(observer);
      expect(observer).not.toHaveBeenCalled();
      observableObject.id = 1;
      expect(observer).not.toHaveBeenCalled();
    });

    it(`Shouldn't call removed observers`, () => {
      const observer1 = jest.fn();
      observableObject.addObserver(observer1);

      const observer2 = jest.fn();
      observableObject.addObserver(observer2);

      observableObject.id = 2;

      const numberOfCalls1 = observer1.mock.calls.length;
      const numberOfCalls2 = observer2.mock.calls.length;

      expect(numberOfCalls1).not.toBe(0);
      expect(numberOfCalls2).not.toBe(0);

      observableObject.removeObserver(observer1);

      observableObject.id = 3;

      expect(observer1.mock.calls.length).toBe(numberOfCalls1);
      expect(observer2.mock.calls.length).not.toBe(numberOfCalls1);
    });

    describe('Observable attribute', () => {
      it('Should call observers when updating an observable attribute', () => {
        const observableAttribute = createObservable({id: 1});
        observableObject.attribute = observableAttribute;
        const observer = jest.fn();
        observableObject.addObserver(observer);
        expect(observer).not.toHaveBeenCalled();
        observableAttribute.id = 2;
        expect(observer).toHaveBeenCalled();
      });

      it(`Should stop calling observers when an observable attribute has been removed`, () => {
        const observableAttribute = createObservable({} as any);
        observableObject.attribute = observableAttribute;

        const observer = jest.fn();
        observableObject.addObserver(observer);

        delete observableObject.attribute;

        const numberOfCalls = observer.mock.calls.length;
        expect(numberOfCalls).not.toBe(0);

        observableAttribute.id = 2;
        expect(observer.mock.calls.length).toBe(numberOfCalls);
      });

      it('Should observe existing attributes', () => {
        const observableObject = createObservable({innerObject: createObservable({id: 1})});
        const observer = jest.fn();
        observableObject.addObserver(observer);

        expect(observer).toHaveBeenCalledTimes(0);

        observableObject.innerObject.id = 2;

        expect(observer).toHaveBeenCalledTimes(1);
      });

      it('Should make existing attributes observable when possible', () => {
        const observableObject = createObservable({innerObject: {id: 1}});

        expect(isObservable(observableObject.innerObject)).toBe(true);

        const observer = jest.fn();
        observableObject.addObserver(observer);

        expect(observer).toHaveBeenCalledTimes(0);

        observableObject.innerObject.id = 2;

        expect(observer).toHaveBeenCalledTimes(1);

        observableObject.innerObject = {id: 3};

        expect(isObservable(observableObject.innerObject)).toBe(true);

        expect(observer).toHaveBeenCalledTimes(2);

        observableObject.innerObject.id = 4;

        expect(observer).toHaveBeenCalledTimes(3);
      });
    });

    describe('Forked observable object', () => {
      let forkedObservableObject: {[key: string]: any} & ObservableType;

      beforeEach(() => {
        forkedObservableObject = Object.create(observableObject);
      });

      it('Should not be an observable', () => {
        expect(isObservable(forkedObservableObject)).toBe(false);
      });

      it('Should not have a method such as addObserver()', () => {
        expect(forkedObservableObject.addObserver).toBeUndefined();
        expect(forkedObservableObject.removeObserver).toBeUndefined();
        expect(forkedObservableObject.callObservers).toBeUndefined();
        expect(forkedObservableObject.isObservable).toBeUndefined();
      });

      it('Should allow changing an attribute without changing the original observable', () => {
        forkedObservableObject.id = 2;
        expect(forkedObservableObject.id).toBe(2);
        expect(observableObject.id).toBe(1);
      });

      it('Should not call the observers of the original observable when changing an attribute', () => {
        const observer = jest.fn();
        observableObject.addObserver(observer);
        expect(observer).not.toHaveBeenCalled();
        forkedObservableObject.id = 2;
        expect(observer).not.toHaveBeenCalled();
      });

      it('Should be able to become an observable', () => {
        expect(isObservable(forkedObservableObject)).toBe(false);
        const observableForkedObservableObject = createObservable(forkedObservableObject);
        expect(isObservable(observableForkedObservableObject)).toBe(true);

        const objectObserver = jest.fn();
        observableObject.addObserver(objectObserver);
        const forkedObjectObserver = jest.fn();
        observableForkedObservableObject.addObserver(forkedObjectObserver);
        expect(objectObserver).not.toHaveBeenCalled();
        expect(forkedObjectObserver).not.toHaveBeenCalled();
        observableForkedObservableObject.id = 2;
        expect(forkedObjectObserver).toHaveBeenCalled();
        expect(objectObserver).not.toHaveBeenCalled();
      });
    });
  });

  describe('Custom observable', () => {
    class BaseCustomObservable extends Observable(Object) {
      _id: number | undefined;

      constructor({id}: {id?: number} = {}) {
        super();
        this._id = id;
      }

      static _limit: number;

      static get limit() {
        return this._limit;
      }

      static set limit(limit) {
        this._limit = limit;
        this.callObservers();
      }

      get id() {
        return this._id;
      }

      set id(id) {
        this._id = id;
        this.callObservers();
      }
    }

    describe('Observable class', () => {
      let CustomObservable: typeof BaseCustomObservable;

      beforeEach(() => {
        CustomObservable = class CustomObservable extends BaseCustomObservable {};
      });

      it('Should be an observable', () => {
        expect(isObservable(CustomObservable)).toBe(true);
      });

      it('Should be usable as the target of a new observable', () => {
        const NewCustomObservable = createObservable(CustomObservable);
        expect(isObservable(NewCustomObservable)).toBe(true);
      });

      it('Should call observers when callObservers() is called', () => {
        const observer = jest.fn();
        CustomObservable.addObserver(observer);
        expect(observer).not.toHaveBeenCalled();
        CustomObservable.callObservers();
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when changing an attribute', () => {
        const observer = jest.fn();
        CustomObservable.addObserver(observer);
        expect(observer).not.toHaveBeenCalled();
        CustomObservable.limit = 2;
        expect(observer).toHaveBeenCalled();
      });

      it(`Shouldn't call removed observers`, () => {
        const observer1 = jest.fn();
        CustomObservable.addObserver(observer1);

        const observer2 = jest.fn();
        CustomObservable.addObserver(observer2);

        CustomObservable.limit = 2;

        const numberOfCalls1 = observer1.mock.calls.length;
        const numberOfCalls2 = observer2.mock.calls.length;

        expect(numberOfCalls1).not.toBe(0);
        expect(numberOfCalls2).not.toBe(0);

        CustomObservable.removeObserver(observer1);

        CustomObservable.limit = 3;

        expect(observer1.mock.calls.length).toBe(numberOfCalls1);
        expect(observer2.mock.calls.length).not.toBe(numberOfCalls1);
      });
    });

    describe('Observable instance', () => {
      let customObservable: BaseCustomObservable;

      beforeEach(() => {
        customObservable = new BaseCustomObservable({id: 1});
      });

      it('Should be an observable', () => {
        expect(isObservable(customObservable)).toBe(true);
      });

      it('Should be usable as the target of a new observable', () => {
        const newCustomObservable = createObservable(customObservable);
        expect(isObservable(newCustomObservable)).toBe(true);
      });

      it('Should call observers when callObservers() is called', () => {
        const observer = jest.fn();
        customObservable.addObserver(observer);
        expect(observer).not.toHaveBeenCalled();
        customObservable.callObservers();
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when changing an attribute', () => {
        const observer = jest.fn();
        customObservable.addObserver(observer);
        expect(observer).not.toHaveBeenCalled();
        customObservable.id = 2;
        expect(observer).toHaveBeenCalled();
      });

      it(`Shouldn't call removed observers`, () => {
        const observer1 = jest.fn();
        customObservable.addObserver(observer1);

        const observer2 = jest.fn();
        customObservable.addObserver(observer2);

        customObservable.id = 2;

        const numberOfCalls1 = observer1.mock.calls.length;
        const numberOfCalls2 = observer2.mock.calls.length;

        expect(numberOfCalls1).not.toBe(0);
        expect(numberOfCalls2).not.toBe(0);

        customObservable.removeObserver(observer1);

        customObservable.id = 3;

        expect(observer1.mock.calls.length).toBe(numberOfCalls1);
        expect(observer2.mock.calls.length).not.toBe(numberOfCalls1);
      });
    });
  });

  describe('Observable object referencing a non-embeddable object', () => {
    let originalObject: {[key: string]: any};
    let observableObject: {[key: string]: any} & ObservableType;

    beforeEach(() => {
      originalObject = {};
      observableObject = createObservable(originalObject);
    });

    it("Shouldn't call referrer's observers", () => {
      class NonEmbeddable extends Observable(Object) {
        static isEmbedded() {
          return false;
        }
      }

      const nonEmbeddable = new NonEmbeddable();

      expect(isEmbeddable(nonEmbeddable)).toBe(false);

      const observer = jest.fn();
      observableObject.addObserver(observer);

      expect(observer).toHaveBeenCalledTimes(0);

      observableObject.nonEmbeddable = nonEmbeddable;

      expect(observer).toHaveBeenCalledTimes(1);

      nonEmbeddable.callObservers();

      expect(observer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Observer payload', () => {
    it('Should allow to specify a payload when calling observers', () => {
      const observableObject = createObservable({} as any);
      const observer = jest.fn();
      observableObject.addObserver(observer);

      expect(observer).not.toHaveBeenCalled();

      observableObject.callObservers({source: 'server'});

      expect(observer.mock.calls[0][0].source).toBe('server');
    });
  });

  describe('Unobservable value', () => {
    it('Should not be possible to observe a primitive', () => {
      expect(canBeObserved(true)).toBe(false);

      expect(canBeObserved(1)).toBe(false);

      expect(canBeObserved('Hello')).toBe(false);

      expect(canBeObserved(new Date())).toBe(false);

      expect(canBeObserved(undefined)).toBe(false);

      expect(canBeObserved(null)).toBe(false);

      // @ts-expect-error
      expect(() => createObservable('Hello')).toThrow(
        'Cannot create an observable from a target that is not an object, an array, or a function'
      );
    });
  });

  describe('Observable with a circular reference', () => {
    it('Should not loop indefinitely', () => {
      const observableObject = createObservable({} as any);

      const observer = jest.fn();
      observableObject.addObserver(observer);
      expect(observer).not.toHaveBeenCalled();
      observableObject.circularReference = observableObject;
      expect(observer).toHaveBeenCalled();
    });
  });
});

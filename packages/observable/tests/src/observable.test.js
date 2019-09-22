import {Observable, createObservable, isObservable, canBecomeObservable} from '../../..';

describe('Observable', () => {
  describe('Observable array', () => {
    let originalArray;
    let observableArray;

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

    it('Should call observers when $notify() is called', () => {
      const observer = jest.fn();
      observableArray.$observe(observer);
      expect(observer).not.toHaveBeenCalled();
      observableArray.$notify();
      expect(observer).toHaveBeenCalled();
    });

    it('Should call observers when changing an item', () => {
      const observer = jest.fn();
      observableArray.$observe(observer);
      expect(observer).not.toHaveBeenCalled();
      observableArray[0] = 1;
      expect(observer).toHaveBeenCalled();
    });

    it('Should not call observers when setting an item with the same value', () => {
      const observer = jest.fn();
      observableArray.$observe(observer);
      expect(observer).not.toHaveBeenCalled();
      observableArray[0] = 3;
      expect(observer).not.toHaveBeenCalled();
    });

    it('Should call observers when changing array length', () => {
      const observer = jest.fn();
      observableArray.$observe(observer);
      expect(observer).not.toHaveBeenCalled();
      observableArray.length = 0;
      expect(observer).toHaveBeenCalled();
    });

    it(`Shouldn't call removed observers`, () => {
      const observer1 = jest.fn();
      observableArray.$observe(observer1);

      const observer2 = jest.fn();
      observableArray.$observe(observer2);

      observableArray[0] = 4;

      const numberOfCalls1 = observer1.mock.calls.length;
      const numberOfCalls2 = observer2.mock.calls.length;

      expect(numberOfCalls1).not.toBe(0);
      expect(numberOfCalls2).not.toBe(0);

      observableArray.$unobserve(observer1);

      observableArray[0] = 5;

      expect(observer1.mock.calls.length).toBe(numberOfCalls1);
      expect(observer2.mock.calls.length).not.toBe(numberOfCalls1);
    });

    describe('Observable item', () => {
      it('Should call observers when updating an observable item', () => {
        const observableItem = createObservable([]);
        observableArray[0] = observableItem;
        const observer = jest.fn();
        observableArray.$observe(observer);
        expect(observer).not.toHaveBeenCalled();
        observableItem.push(1);
        expect(observer).toHaveBeenCalled();
      });

      it(`Should stop calling observers when an observable item has been removed`, () => {
        const observableItem = createObservable([]);
        observableArray[0] = observableItem;

        const observer = jest.fn();
        observableArray.$observe(observer);

        observableArray[0] = null;

        const numberOfCalls = observer.mock.calls.length;
        expect(numberOfCalls).not.toBe(0);

        observableItem.push(1);
        expect(observer.mock.calls.length).toBe(numberOfCalls);
      });
    });

    describe('Mutator methods', () => {
      it('Should call observers when using copyWithin()', () => {
        const observer = jest.fn();
        observableArray.$observe(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.copyWithin(0, 1);
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using fill()', () => {
        const observer = jest.fn();
        observableArray.$observe(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.fill(0);
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using pop()', () => {
        const observer = jest.fn();
        observableArray.$observe(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.pop();
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using push()', () => {
        const observer = jest.fn();
        observableArray.$observe(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.push(4);
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using reverse()', () => {
        const observer = jest.fn();
        observableArray.$observe(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.reverse();
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using shift()', () => {
        const observer = jest.fn();
        observableArray.$observe(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.shift();
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using sort()', () => {
        const observer = jest.fn();
        observableArray.$observe(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.sort();
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using splice()', () => {
        const observer = jest.fn();
        observableArray.$observe(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.splice(0, 1);
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using unshift()', () => {
        const observer = jest.fn();
        observableArray.$observe(observer);
        expect(observer).not.toHaveBeenCalled();
        observableArray.unshift(4);
        expect(observer).toHaveBeenCalled();
      });
    });
  });

  describe('Observable object', () => {
    let originalObject;
    let observableObject;

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

    it('Should be usable as the target of a new observable', () => {
      const newObservableObject = createObservable(observableObject);
      expect(isObservable(newObservableObject)).toBe(true);
    });

    it('Should be equal to the original object', () => {
      expect(observableObject).toEqual(originalObject);
    });

    it('Should produce the same JSON as the original object', () => {
      expect(JSON.stringify(observableObject)).toBe(JSON.stringify(originalObject));
    });

    it('Should call observers when $notify() is called', () => {
      const observer = jest.fn();
      observableObject.$observe(observer);
      expect(observer).not.toHaveBeenCalled();
      observableObject.$notify();
      expect(observer).toHaveBeenCalled();
    });

    it('Should call observers when changing an attribute', () => {
      const observer = jest.fn();
      observableObject.$observe(observer);
      expect(observer).not.toHaveBeenCalled();
      observableObject.id = 2;
      expect(observer).toHaveBeenCalled();
    });

    it('Should not call observers when setting an attribute with the same value', () => {
      const observer = jest.fn();
      observableObject.$observe(observer);
      expect(observer).not.toHaveBeenCalled();
      observableObject.id = 1;
      expect(observer).not.toHaveBeenCalled();
    });

    it(`Shouldn't call removed observers`, () => {
      const observer1 = jest.fn();
      observableObject.$observe(observer1);

      const observer2 = jest.fn();
      observableObject.$observe(observer2);

      observableObject.id = 2;

      const numberOfCalls1 = observer1.mock.calls.length;
      const numberOfCalls2 = observer2.mock.calls.length;

      expect(numberOfCalls1).not.toBe(0);
      expect(numberOfCalls2).not.toBe(0);

      observableObject.$unobserve(observer1);

      observableObject.id = 3;

      expect(observer1.mock.calls.length).toBe(numberOfCalls1);
      expect(observer2.mock.calls.length).not.toBe(numberOfCalls1);
    });

    describe('Observable attribute', () => {
      it('Should call observers when updating an observable attribute', () => {
        const observableAttribute = createObservable({id: 1});
        observableObject.attribute = observableAttribute;
        const observer = jest.fn();
        observableObject.$observe(observer);
        expect(observer).not.toHaveBeenCalled();
        observableAttribute.id = 2;
        expect(observer).toHaveBeenCalled();
      });

      it(`Should stop calling observers when an observable attribute has been removed`, () => {
        const observableAttribute = createObservable([]);
        observableObject.attribute = observableAttribute;

        const observer = jest.fn();
        observableObject.$observe(observer);

        delete observableObject.attribute;

        const numberOfCalls = observer.mock.calls.length;
        expect(numberOfCalls).not.toBe(0);

        observableAttribute.id = 2;
        expect(observer.mock.calls.length).toBe(numberOfCalls);
      });
    });
  });

  describe('Custom observable object', () => {
    class ObservableObject extends Observable() {
      constructor({id} = {}) {
        super();
        this._id = id;
      }

      get id() {
        return this._id;
      }

      set id(id) {
        this._id = id;
        this.$notify();
      }
    }

    let observableObject;

    beforeEach(() => {
      observableObject = new ObservableObject({id: 1});
    });

    it('Should be an observable', () => {
      expect(isObservable(observableObject)).toBe(true);
    });

    it('Should be usable as the target of a new observable', () => {
      const newObservableObject = createObservable(observableObject);
      expect(isObservable(newObservableObject)).toBe(true);
    });

    it('Should call observers when $notify() is called', () => {
      const observer = jest.fn();
      observableObject.$observe(observer);
      expect(observer).not.toHaveBeenCalled();
      observableObject.$notify();
      expect(observer).toHaveBeenCalled();
    });

    it('Should call observers when changing an attribute', () => {
      const observer = jest.fn();
      observableObject.$observe(observer);
      expect(observer).not.toHaveBeenCalled();
      observableObject.id = 2;
      expect(observer).toHaveBeenCalled();
    });

    it(`Shouldn't call removed observers`, () => {
      const observer1 = jest.fn();
      observableObject.$observe(observer1);

      const observer2 = jest.fn();
      observableObject.$observe(observer2);

      observableObject.id = 2;

      const numberOfCalls1 = observer1.mock.calls.length;
      const numberOfCalls2 = observer2.mock.calls.length;

      expect(numberOfCalls1).not.toBe(0);
      expect(numberOfCalls2).not.toBe(0);

      observableObject.$unobserve(observer1);

      observableObject.id = 3;

      expect(observer1.mock.calls.length).toBe(numberOfCalls1);
      expect(observer2.mock.calls.length).not.toBe(numberOfCalls1);
    });
  });

  describe('Unobservable value', () => {
    it('Should not be possible to $observe a primitive', () => {
      expect(canBecomeObservable(true)).toBe(false);

      expect(canBecomeObservable(1)).toBe(false);

      expect(canBecomeObservable('Hello')).toBe(false);

      expect(canBecomeObservable(new Date())).toBe(false);

      expect(canBecomeObservable(undefined)).toBe(false);

      expect(canBecomeObservable(null)).toBe(false);

      expect(() => createObservable('Hello')).toThrow(
        /Observable target must be an object or an array/
      );
    });
  });

  describe('Observable with a circular reference', () => {
    it('Should not loop indefinitely', () => {
      const observableObject = createObservable({});

      const observer = jest.fn();
      observableObject.$observe(observer);
      expect(observer).not.toHaveBeenCalled();
      observableObject.circularReference = observableObject;
      expect(observer).toHaveBeenCalled();
    });
  });
});

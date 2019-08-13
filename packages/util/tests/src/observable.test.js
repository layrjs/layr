import {Observable} from '../../..';

describe('Observable', () => {
  describe('Observable array', () => {
    let originalArray;
    let observableArray;

    beforeEach(() => {
      originalArray = [3, 2, 1];
      observableArray = new Observable(originalArray);
    });

    it('Should be an array', () => {
      expect(Array.isArray(originalArray)).toBe(true);
      expect(Array.isArray(observableArray)).toBe(true);
    });

    it('Should be an observable', () => {
      expect(originalArray instanceof Observable).toBe(false);
      expect(observableArray instanceof Observable).toBe(true);
    });

    it('Should be usable as the target of a new Observable', () => {
      const newObservableArray = new Observable(observableArray);
      expect(newObservableArray instanceof Observable).toBe(true);
    });

    it('Should be equal to the original array', () => {
      expect(observableArray).toEqual(originalArray);
    });

    it('Should produce the same JSON as the original array', () => {
      expect(JSON.stringify(observableArray)).toBe(JSON.stringify(originalArray));
    });

    it('Should call observers when changing an item', () => {
      const observer = jest.fn();
      observableArray.observe(observer);
      observableArray[0] = 1;
      expect(observer).toHaveBeenCalled();
    });

    it('Should call observers when changing array length', () => {
      const observer = jest.fn();
      observableArray.observe(observer);
      observableArray.length = 0;
      expect(observer).toHaveBeenCalled();
    });

    it(`Shouldn't call removed observers`, () => {
      const observer1 = jest.fn();
      observableArray.observe(observer1);

      const observer2 = jest.fn();
      observableArray.observe(observer2);

      observableArray[0] = 4;

      const numberOfCalls1 = observer1.mock.calls.length;
      const numberOfCalls2 = observer2.mock.calls.length;

      expect(numberOfCalls1).not.toBe(0);
      expect(numberOfCalls2).not.toBe(0);

      observableArray.unobserve(observer1);

      observableArray[0] = 5;

      expect(observer1.mock.calls.length).toBe(numberOfCalls1);
      expect(observer2.mock.calls.length).not.toBe(numberOfCalls1);
    });

    describe('Observable item', () => {
      it('Should call observers when updating an observable item', () => {
        const observableItem = new Observable([]);
        observableArray[0] = observableItem;
        const observer = jest.fn();
        observableArray.observe(observer);
        observableItem.push(1);
        expect(observer).toHaveBeenCalled();
      });

      it(`Should stop calling observers when an observable item has been removed`, () => {
        const observableItem = new Observable([]);
        observableArray[0] = observableItem;

        const observer = jest.fn();
        observableArray.observe(observer);

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
        observableArray.observe(observer);
        observableArray.copyWithin(0, 1);
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using fill()', () => {
        const observer = jest.fn();
        observableArray.observe(observer);
        observableArray.fill(0);
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using pop()', () => {
        const observer = jest.fn();
        observableArray.observe(observer);
        observableArray.pop();
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using push()', () => {
        const observer = jest.fn();
        observableArray.observe(observer);
        observableArray.push(4);
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using reverse()', () => {
        const observer = jest.fn();
        observableArray.observe(observer);
        observableArray.reverse();
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using shift()', () => {
        const observer = jest.fn();
        observableArray.observe(observer);
        observableArray.shift();
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using sort()', () => {
        const observer = jest.fn();
        observableArray.observe(observer);
        observableArray.sort();
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using splice()', () => {
        const observer = jest.fn();
        observableArray.observe(observer);
        observableArray.splice(0, 1);
        expect(observer).toHaveBeenCalled();
      });

      it('Should call observers when using unshift()', () => {
        const observer = jest.fn();
        observableArray.observe(observer);
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
      observableObject = new Observable(originalObject);
    });

    it('Should be an object', () => {
      expect(typeof originalObject).toEqual('object');
      expect(typeof observableObject).toEqual('object');
    });

    it('Should be an observable', () => {
      expect(originalObject instanceof Observable).toBe(false);
      expect(observableObject instanceof Observable).toBe(true);
    });

    it('Should be usable as the target of a new Observable', () => {
      const newObservableObject = new Observable(observableObject);
      expect(newObservableObject instanceof Observable).toBe(true);
    });

    it('Should be equal to the original object', () => {
      expect(observableObject).toEqual(originalObject);
    });

    it('Should produce the same JSON as the original object', () => {
      expect(JSON.stringify(observableObject)).toBe(JSON.stringify(originalObject));
    });

    it('Should call observers when changing an attribute', () => {
      const observer = jest.fn();
      observableObject.observe(observer);
      observableObject.id = 2;
      expect(observer).toHaveBeenCalled();
    });

    it(`Shouldn't call removed observers`, () => {
      const observer1 = jest.fn();
      observableObject.observe(observer1);

      const observer2 = jest.fn();
      observableObject.observe(observer2);

      observableObject.id = 2;

      const numberOfCalls1 = observer1.mock.calls.length;
      const numberOfCalls2 = observer2.mock.calls.length;

      expect(numberOfCalls1).not.toBe(0);
      expect(numberOfCalls2).not.toBe(0);

      observableObject.unobserve(observer1);

      observableObject.id = 3;

      expect(observer1.mock.calls.length).toBe(numberOfCalls1);
      expect(observer2.mock.calls.length).not.toBe(numberOfCalls1);
    });

    describe('Observable attribute', () => {
      it('Should call observers when updating an observable attribute', () => {
        const observableAttribute = new Observable({id: 1});
        observableObject.attribute = observableAttribute;
        const observer = jest.fn();
        observableObject.observe(observer);
        observableAttribute.id = 2;
        expect(observer).toHaveBeenCalled();
      });

      it(`Should stop calling observers when an observable attribute has been removed`, () => {
        const observableAttribute = new Observable([]);
        observableObject.attribute = observableAttribute;

        const observer = jest.fn();
        observableObject.observe(observer);

        delete observableObject.attribute;

        const numberOfCalls = observer.mock.calls.length;
        expect(numberOfCalls).not.toBe(0);

        observableAttribute.id = 2;
        expect(observer.mock.calls.length).toBe(numberOfCalls);
      });
    });
  });
});

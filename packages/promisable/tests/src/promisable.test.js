import {Promisable, makePromisable} from '../../..';

describe('Promisable', () => {
  class PromisableObject extends Promisable() {}

  let promisableObject;

  beforeEach(() => {
    promisableObject = new PromisableObject();
  });

  test('Zero promise', async () => {
    const result = await promisableObject;
    expect(result).toEqual([]);
  });

  test('One promise', async () => {
    const timer = new Timer(30);
    promisableObject.addPromise(timer.start());
    expect(timer.isRunning).toBe(true);
    const result = await promisableObject;
    expect(result).toEqual([timer]);
    expect(timer.isRunning).toBe(false);
  });

  test('Several promises', async () => {
    const timer1 = new Timer(30);
    const timer2 = new Timer(40);
    const timer3 = new Timer(20);
    promisableObject.addPromise(timer1.start());
    promisableObject.addPromise(timer2.start());
    promisableObject.addPromise(timer3.start());
    expect(timer1.isRunning).toBe(true);
    expect(timer2.isRunning).toBe(true);
    expect(timer3.isRunning).toBe(true);
    const result = await promisableObject;
    expect(result).toEqual([timer1, timer2, timer3]);
    expect(timer1.isRunning).toBe(false);
    expect(timer2.isRunning).toBe(false);
    expect(timer3.isRunning).toBe(false);
  });

  test('then()', done => {
    const timer1 = new Timer(30);
    const timer2 = new Timer(20);
    promisableObject.addPromise(timer1.start());
    expect(timer1.isRunning).toBe(true);
    promisableObject
      .then(result => {
        expect(result).toEqual([timer1]);
        expect(timer1.isRunning).toBe(false);
        promisableObject.addPromise(timer2.start());
        expect(timer2.isRunning).toBe(true);
        return promisableObject;
      })
      .then(result => {
        expect(result).toEqual([timer2]);
        expect(timer1.isRunning).toBe(false);
        expect(timer2.isRunning).toBe(false);
        done();
      });
  });

  test('Error', async () => {
    const timer = new Timer(30, {throwError: new Error('The timer has thrown an error')});
    promisableObject.addPromise(timer.start());
    expect(timer.isRunning).toBe(true);
    await expect(promisableObject).rejects.toThrow(/The timer has thrown an error/);
    expect(timer.isRunning).toBe(false);
  });

  test('Pending status', async () => {
    expect(promisableObject.isPending()).toBe(false);
    const timer1 = new Timer(10);
    const timer2 = new Timer(30);
    promisableObject.addPromise(timer1.start());
    promisableObject.addPromise(timer2.start());
    expect(promisableObject.isPending()).toBe(true);
    await new Timer(20).start();
    expect(promisableObject.isPending()).toBe(true);
    await new Timer(20).start();
    expect(promisableObject.isPending()).toBe(false);
  });

  test('Promise statuses without rejection', async () => {
    expect(promisableObject.isPending()).toBe(false);
    expect(promisableObject.isFulfilled()).toBe(true);
    expect(promisableObject.isRejected()).toBe(false);
    expect(promisableObject.getFulfilledValues()).toEqual([]);
    expect(promisableObject.getRejectionReasons()).toEqual([]);

    const timer1 = new Timer(10);
    const timer2 = new Timer(30);
    promisableObject.addPromise(timer1.start());
    promisableObject.addPromise(timer2.start());
    expect(promisableObject.isPending()).toBe(true);
    expect(promisableObject.isFulfilled()).toBe(false);
    expect(promisableObject.isRejected()).toBe(false);
    expect(promisableObject.getFulfilledValues()).toEqual([]);
    expect(promisableObject.getRejectionReasons()).toEqual([]);

    await new Timer(20).start();
    expect(promisableObject.isPending()).toBe(true);
    expect(promisableObject.isFulfilled()).toBe(false);
    expect(promisableObject.isRejected()).toBe(false);
    expect(promisableObject.getFulfilledValues()).toEqual([timer1]);
    expect(promisableObject.getRejectionReasons()).toEqual([]);

    await new Timer(20).start();
    expect(promisableObject.isPending()).toBe(false);
    expect(promisableObject.isFulfilled()).toBe(true);
    expect(promisableObject.isRejected()).toBe(false);
    expect(promisableObject.getFulfilledValues()).toEqual([timer1, timer2]);
    expect(promisableObject.getRejectionReasons()).toEqual([]);
  });

  test('Promise statuses with rejection', async () => {
    expect(promisableObject.isPending()).toBe(false);
    expect(promisableObject.isFulfilled()).toBe(true);
    expect(promisableObject.isRejected()).toBe(false);
    expect(promisableObject.getFulfilledValues()).toEqual([]);
    expect(promisableObject.getRejectionReasons()).toEqual([]);

    const error1 = new Error('Timer1 has thrown an error');
    const timer1 = new Timer(10, {throwError: error1});
    const timer2 = new Timer(30);
    promisableObject.addPromise(timer1.start()).catch(() => {}); // Let's avoid unhandled exceptions
    promisableObject.addPromise(timer2.start());
    expect(promisableObject.isPending()).toBe(true);
    expect(promisableObject.isFulfilled()).toBe(false);
    expect(promisableObject.isRejected()).toBe(false);
    expect(promisableObject.getFulfilledValues()).toEqual([]);
    expect(promisableObject.getRejectionReasons()).toEqual([]);

    await new Timer(20).start();
    expect(promisableObject.isPending()).toBe(false);
    expect(promisableObject.isFulfilled()).toBe(false);
    expect(promisableObject.isRejected()).toBe(true);
    expect(promisableObject.getFulfilledValues()).toEqual([]);
    expect(promisableObject.getRejectionReasons()).toEqual([error1]);

    await new Timer(20).start();
    expect(promisableObject.isPending()).toBe(false);
    expect(promisableObject.isFulfilled()).toBe(false);
    expect(promisableObject.isRejected()).toBe(true);
    expect(promisableObject.getFulfilledValues()).toEqual([timer2]);
    expect(promisableObject.getRejectionReasons()).toEqual([error1]);

    expect(() => {
      const timer3 = new Timer(20);
      promisableObject.addPromise(timer3.start());
    }).toThrow(/Cannot add a new promise when an older one has been rejected/);
  });

  test('getPromises()', async () => {
    expect(promisableObject.getPromises()).toEqual([]);
    const promise1 = new Timer(30).start();
    const promise2 = new Timer(40).start();
    promisableObject.addPromise(promise1);
    promisableObject.addPromise(promise2);
    expect(promisableObject.getPromises()).toEqual([promise1, promise2]);
    await promisableObject;
    expect(promisableObject.getPromises()).toEqual([]);
  });

  test('makePromisable()', async () => {
    const promisableArray = makePromisable([]);

    const promise = (async () => {
      await new Timer(30).start();
      promisableArray.push(1, 2, 3);
    })();
    promisableArray.addPromise(promise);

    expect(promisableArray).toEqual([]);
    await promisableArray;
    expect(promisableArray).toEqual([1, 2, 3]);
  });
});

class Timer {
  constructor(time, {throwError} = {}) {
    this.time = time;
    this.isRunning = false;
    this.throwError = throwError;
  }

  start() {
    this.isRunning = true;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.isRunning = false;
        if (!this.throwError) {
          resolve(this);
        } else {
          reject(this.throwError);
        }
      }, this.time);
    });
  }
}

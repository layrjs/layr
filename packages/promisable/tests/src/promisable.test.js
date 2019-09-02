import {createPromisable} from '../../..';

describe('Promisable', () => {
  test('Proxy', async () => {
    const object = {};
    const promisableObject = createPromisable(object, Promise.resolve());
    expect(promisableObject).not.toBe(object);

    expect(promisableObject.attribute).toBe(undefined);
    promisableObject.attribute = 'value';
    expect(promisableObject.attribute).toBe('value');
    expect(object.attribute).toBe('value');
  });

  test('await promisable', async () => {
    const object = {};
    const timer = new Timer(30);
    const promisableObject = createPromisable(object, timer.start());

    expect(promisableObject).not.toBe(object);

    expect(timer.isRunning).toBe(true);
    const result = await promisableObject;
    expect(result).toBe(object);
    expect(timer.isRunning).toBe(false);
  });

  test('promisable.then()', done => {
    const object = {};
    const timer = new Timer(30);
    const promisableObject = createPromisable(object, timer.start());

    expect(promisableObject).not.toBe(object);

    expect(timer.isRunning).toBe(true);
    promisableObject.then(result => {
      expect(result).toBe(object);
      expect(timer.isRunning).toBe(false);
      done();
    });
  });

  test('Error', async () => {
    const object = {};
    const timer = new Timer(30, {throwError: new Error('The timer has thrown an error')});
    const promisableObject = createPromisable(object, timer.start());

    expect(timer.isRunning).toBe(true);
    await expect(promisableObject).rejects.toThrow(/The timer has thrown an error/);
    expect(timer.isRunning).toBe(false);
  });

  test('getPromise()', async () => {
    const object = {};
    const promise = Promise.resolve();
    const promisableObject = createPromisable(object, promise);

    expect(promisableObject.getPromise()).toBe(promise);
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

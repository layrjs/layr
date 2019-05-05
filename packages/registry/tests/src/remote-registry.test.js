import {Registry, Registerable, Serializable, RegistryProxy, remoteMethod} from '../../..';

describe('Remote registry', () => {
  test('Remote call', async () => {
    const BaseMath = Base =>
      class BaseMath extends Base {
        initialize({a, b, lastResult, ...object} = {}, options) {
          super.initialize(object, options);
          this.a = a;
          this.b = b;
          this.lastResult = lastResult;
        }

        serialize(options) {
          return {
            ...super.serialize(options),
            a: this.a,
            b: this.b,
            lastResult: this.lastResult
          };
        }

        // Let's simulate an identity map

        static loadInstance() {
          return this._instance;
        }

        static saveInstance(instance) {
          this._instance = instance;
        }
      };

    const backendProxy = (() => {
      // Backend

      class Math extends BaseMath(Serializable(Registerable())) {
        static async sum(a, b) {
          return a + b;
        }

        async sum() {
          const result = this.a + this.b;
          this.lastResult = result;
          return result;
        }
      }

      const registry = new Registry('backend', {register: {Math}, allowQuerySources: ['frontend']});

      return new RegistryProxy(registry);
    })();

    // Frontend

    class Math extends BaseMath(Serializable(Registerable())) {
      @remoteMethod() static sum;

      @remoteMethod() sum;
    }

    const registry = new Registry('frontend', {register: {Math}, remoteRegistry: backendProxy});

    expect(await registry.Math.sum(1, 2)).toBe(3);

    const math = new registry.Math({a: 2, b: 3});
    const result = await math.sum();
    expect(result).toBe(5);
    expect(math.lastResult).toBe(5);

    const databaseRegistry = new Registry('database', {
      register: {Math},
      remoteRegistry: backendProxy
    });
    await expect(databaseRegistry.Math.sum(1, 2)).rejects.toThrow(/Query source not allowed/);
  });
});

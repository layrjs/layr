import {Layer, Registerable, Serializable, LayerProxy, parentMethod} from '../../..';

describe('Parent layer', () => {
  test('Parent call', async () => {
    const BaseMath = Base =>
      class BaseMath extends Base {
        constructor({a, b, ...object} = {}, {isDeserializing} = {}) {
          super(object, {isDeserializing});
          if (!isDeserializing) {
            this.a = a;
            this.b = b;
          }
          this.constructor.setInstance(this);
        }

        serialize() {
          return {
            ...super.serialize(),
            a: this.a,
            b: this.b,
            lastResult: this.lastResult
          };
        }

        static deserialize(object) {
          let instance = this.getInstance(object);
          if (instance) {
            instance.deserialize(object);
            return instance;
          }
          instance = new this(object, {isDeserializing: true});
          instance.deserialize(object);
          return instance;
        }

        deserialize({a, b, lastResult} = {}) {
          this.a = a;
          this.b = b;
          this.lastResult = lastResult;
        }

        // Let's simulate an identity map

        static getInstance(_object) {
          return this._instance;
        }

        static setInstance(instance) {
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

      const layer = new Layer({Math}, {name: 'backend'});

      return new LayerProxy(layer);
    })();

    // Frontend

    class Math extends BaseMath(Serializable(Registerable())) {
      @parentMethod() static sum;

      @parentMethod() sum;
    }

    const layer = new Layer({Math}, {name: 'frontend', parentLayer: backendProxy});

    expect(await layer.Math.sum(1, 2)).toBe(3);

    const math = new layer.Math({a: 2, b: 3});
    const result = await math.sum();
    expect(result).toBe(5);
    expect(math.lastResult).toBe(5);
  });
});

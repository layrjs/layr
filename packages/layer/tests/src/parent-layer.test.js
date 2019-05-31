import {Layer, Registerable, Serializable, LayerProxy, expose} from '../../..';

describe('Parent layer', () => {
  test('Parent call', () => {
    class BaseMath extends Serializable(Registerable()) {
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

      deserialize({a, b, lastResult} = {}) {
        this.a = a;
        this.b = b;
        this.lastResult = lastResult;
      }

      // Let's simulate an identity map

      static getInstance(_object, _previousInstance) {
        return this._instance;
      }

      static setInstance(instance) {
        this._instance = instance;
      }
    }

    const backendProxy = (() => {
      // Backend

      @expose()
      class Math extends BaseMath {
        @expose() static sum(a, b) {
          return a + b;
        }

        @expose() sum() {
          const result = this.a + this.b;
          this.lastResult = result;
          return result;
        }
      }

      const layer = new Layer({Math}, {name: 'backend'});

      return new LayerProxy(layer);
    })();

    // Frontend

    class Math extends BaseMath {
      static sum(a, b) {
        return super.sum(a, b);
      }

      sum(a, b) {
        return super.sum(a, b);
      }
    }

    const layer = new Layer({Math}, {name: 'frontend', parent: backendProxy});

    expect(layer.getParent()).toBe(backendProxy);
    expect(layer.hasParent()).toBe(true);
    expect(layer.Math.hasParentLayer()).toBe(true);

    expect(layer.Math.sum(1, 2)).toBe(3);

    const math = new layer.Math({a: 2, b: 3});

    expect(math.hasParentLayer()).toBe(true);

    const result = math.sum();
    expect(result).toBe(5);
    expect(math.lastResult).toBe(5);
  });
});

import {Layer, Registerable, Serializable, LayerProxy, expose} from '../../..';

describe('Parent layer via proxy', () => {
  test('Parent call', () => {
    class BaseAuthenticator extends Serializable(Registerable()) {
      $serialize() {
        return {
          ...super.$serialize(),
          token: this.token
        };
      }

      $deserialize({token} = {}) {
        this.token = token;
      }
    }

    class BaseMath extends Serializable(Registerable()) {
      constructor({a, b, ...object} = {}, {isDeserializing} = {}) {
        super(object, {isDeserializing});
        if (!isDeserializing) {
          this.a = a;
          this.b = b;
        }
        this.constructor.$setInstance(this);
      }

      $serialize() {
        return {
          ...super.$serialize(),
          a: this.a,
          b: this.b,
          lastResult: this.lastResult
        };
      }

      $deserialize({a, b, lastResult} = {}) {
        this.a = a;
        this.b = b;
        this.lastResult = lastResult;
      }

      // Let's simulate an identity map

      static $getInstance(_object, _previousInstance) {
        return this._instance;
      }

      static $setInstance(instance) {
        this._instance = instance;
      }
    }

    const backendProxy = (() => {
      // Backend

      @expose()
      class Authenticator extends BaseAuthenticator {
        @expose() signIn() {
          this.token = '123456789';
        }

        @expose() signOut() {
          this.token = undefined;
        }
      }

      @expose()
      class Math extends BaseMath {
        @expose() static sum(a, b) {
          this.authorize();
          return a + b;
        }

        @expose() sum() {
          this.constructor.authorize();
          const result = this.a + this.b;
          this.lastResult = result;
          return result;
        }

        static authorize() {
          const {token} = this.$layer.authenticator;
          if (token !== '123456789') {
            throw new Error('Token is invalid');
          }
        }
      }

      const authenticator = expose()(Authenticator.$deserialize());

      const layer = new Layer({authenticator, Math}, {name: 'backend'});

      return new LayerProxy(layer);
    })();

    // Frontend

    class Authenticator extends BaseAuthenticator {}

    class Math extends BaseMath {
      static sum(a, b) {
        return super.sum(a, b);
      }

      sum(a, b) {
        return super.sum(a, b);
      }
    }

    const authenticator = Authenticator.$deserialize();

    const layer = new Layer({authenticator, Math}, {name: 'frontend', parent: backendProxy});

    expect(layer.getParent()).toBe(backendProxy);
    expect(layer.hasParent()).toBe(true);
    expect(layer.Math.$hasParentLayer()).toBe(true);

    expect(layer.authenticator.token).toBeUndefined();
    layer.authenticator.signIn();
    expect(layer.authenticator.token).toBe('123456789');

    expect(layer.Math.sum(1, 2)).toBe(3);

    const math = new layer.Math({a: 2, b: 3});

    expect(math.$hasParentLayer()).toBe(true);

    const result = math.sum();
    expect(result).toBe(5);
    expect(math.lastResult).toBe(5);

    expect(layer.authenticator.token).toBe('123456789');
    layer.authenticator.signOut();
    expect(layer.authenticator.token).toBeUndefined();

    expect(() => layer.Math.sum(1, 2)).toThrow(/Token is invalid/);
  });
});

import {Layer, Registerable, Serializable, expose} from '../../..';
import {LayerHTTPClient} from '@liaison/layer-http-client';
import {LayerHTTPServer} from '@liaison/layer-http-server';

function runTests({viaHTTP = false} = {}) {
  describe(`Parent layer${viaHTTP ? ' (via HTTP)' : ''}`, () => {
    class BaseAuthenticator extends Serializable(Registerable()) {
      $serialize() {
        return {
          ...super.$serialize(),
          token: this.token
        };
      }

      $deserialize({token} = {}) {
        super.$deserialize();
        this.token = token;
      }
    }

    class BaseMovie extends Serializable(Registerable()) {
      $serialize() {
        return {
          ...super.$serialize(),
          title: this.title,
          year: this.year,
          ratingSum: this.ratingSum,
          ratingCount: this.ratingCount
        };
      }

      $deserialize({title, year, ratingSum, ratingCount} = {}) {
        super.$deserialize();
        this.title = title;
        this.year = year;
        this.ratingSum = ratingSum;
        this.ratingCount = ratingCount;
      }

      static $getInstance(_object, _previousInstance) {
        // Let's simulate an identity map
        return this._instance;
      }

      static $setInstance(instance) {
        // Let's simulate an identity map
        this._instance = instance;
      }

      getAverageRating() {
        let rating = this.ratingSum / this.ratingCount;
        rating = Math.round(rating * 10) / 10;
        return rating;
      }
    }

    let backendLayer;
    let backendLayerServer;
    let frontendLayer;

    beforeAll(async () => {
      async function createBackendLayer() {
        async function layerCreator() {
          class Authenticator extends BaseAuthenticator {
            @expose() signIn() {
              this.token = '123456789';
            }

            @expose() signOut() {
              this.token = undefined;
            }
          }

          class Movie extends BaseMovie {
            @expose() static get(id) {
              this.authorize();
              if (id === 'abc123') {
                return this.$deserialize({
                  title: 'Inception',
                  year: 2010,
                  ratingSum: 9,
                  ratingCount: 1
                });
              }
              throw new Error(`Movie not found (id: '${id}')`);
            }

            @expose() rate(rating) {
              this.constructor.authorize();
              this.ratingSum += rating;
              this.ratingCount += 1;
            }

            static authorize() {
              const {token} = this.$layer.authenticator;
              if (token !== '123456789') {
                throw new Error('Token is invalid');
              }
            }
          }

          const authenticator = Authenticator.$deserialize();

          return new Layer({Movie, authenticator}, {name: 'backend'});
        }

        let layer;
        let layerServer;

        if (!viaHTTP) {
          layer = await layerCreator();
        } else {
          layerServer = new LayerHTTPServer(layerCreator, {port: 4444});
          await layerServer.start();

          const layerClient = new LayerHTTPClient('http://localhost:4444');
          layer = layerClient.getLayer();
        }

        await layer.open();

        return {layer, layerServer};
      }

      async function createFrontendLayer(backendLayer) {
        class Authenticator extends BaseAuthenticator {}

        class Movie extends BaseMovie {}

        const authenticator = Authenticator.$deserialize();

        const layer = new Layer({Movie, authenticator}, {name: 'frontend', parent: backendLayer});
        await layer.open();

        return {layer};
      }

      ({layer: backendLayer, layerServer: backendLayerServer} = await createBackendLayer());
      ({layer: frontendLayer} = await createFrontendLayer(backendLayer));
    });

    afterAll(async () => {
      await backendLayerServer?.stop();
    });

    test('Parent call', async () => {
      expect(frontendLayer.authenticator.token).toBeUndefined();
      if (!viaHTTP) {
        frontendLayer.authenticator.signIn();
      } else {
        await frontendLayer.authenticator.signIn();
      }
      expect(frontendLayer.authenticator.token).toBe('123456789');

      const movie = !viaHTTP ?
        frontendLayer.Movie.get('abc123') :
        await frontendLayer.Movie.get('abc123');
      expect(movie instanceof frontendLayer.Movie).toBe(true);
      expect(movie.title).toBe('Inception');
      expect(movie.year).toBe(2010);
      expect(movie.ratingSum).toBe(9);
      expect(movie.ratingCount).toBe(1);
      expect(movie.getAverageRating()).toBe(9);

      if (!viaHTTP) {
        movie.rate(7);
      } else {
        await movie.rate(7);
      }
      expect(movie.ratingSum).toBe(16);
      expect(movie.ratingCount).toBe(2);
      expect(movie.getAverageRating()).toBe(8);

      expect(frontendLayer.authenticator.token).toBe('123456789');
      if (!viaHTTP) {
        frontendLayer.authenticator.signOut();
      } else {
        await frontendLayer.authenticator.signOut();
      }
      expect(frontendLayer.authenticator.token).toBeUndefined();

      if (!viaHTTP) {
        expect(() => frontendLayer.Movie.get('abc123')).toThrow(/Token is invalid/);
      } else {
        await expect(frontendLayer.Movie.get('abc123')).rejects.toThrow(/Token is invalid/);
      }
    });
  });
}

runTests();
runTests({viaHTTP: true});

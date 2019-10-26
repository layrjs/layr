import {Layer, Registerable, Serializable, property} from '../../..';
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
      getAverageRating() {
        let rating = this.ratingSum / this.ratingCount;
        rating = Math.round(rating * 10) / 10;
        return rating;
      }

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
        this.title = title;
        this.year = year;
        this.ratingSum = ratingSum;
        this.ratingCount = ratingCount;
        super.$deserialize();
      }
    }

    let backendLayer;
    let backendLayerServer;
    let frontendLayer;

    beforeAll(async () => {
      async function createBackendLayer() {
        async function layerCreator() {
          class Authenticator extends BaseAuthenticator {
            @property({expose: {call: true}}) signIn() {
              this.token = '123456789';
            }

            @property({expose: {call: true}}) signOut() {
              this.token = undefined;
            }
          }

          class Movie extends BaseMovie {
            @property({expose: {call: true}}) static get(id) {
              this.authorize();

              if (id === 'abc123') {
                return this.$deserialize({
                  title: 'Inception',
                  year: 2010,
                  ratingSum: 9,
                  ratingCount: 1
                });
              }

              if (id === 'abc456') {
                return this.$deserialize({
                  title: 'The Matrix',
                  year: 1999,
                  ratingSum: 18,
                  ratingCount: 2
                });
              }

              throw new Error(`Movie not found (id: '${id}')`);
            }

            @property({expose: {call: true}}) rate(rating) {
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
          layer = await layerClient.getLayer();
        }

        return {layer, layerServer};
      }

      async function createFrontendLayer(backendLayer) {
        class Authenticator extends BaseAuthenticator {}

        class Movie extends BaseMovie {
          // Let's simulate an identity map

          static _instances = [];

          static $getInstance(object, _previousInstance) {
            return this._instances[object.title];
          }

          static $setInstance(instance) {
            this._instances[instance.title] = instance;
          }
        }

        const authenticator = Authenticator.$deserialize();

        const layer = new Layer({Movie, authenticator}, {name: 'frontend', parent: backendLayer});

        return {layer};
      }

      ({layer: backendLayer, layerServer: backendLayerServer} = await createBackendLayer());
      ({layer: frontendLayer} = await createFrontendLayer(backendLayer));
    });

    afterAll(async () => {
      await backendLayerServer?.stop();
    });

    test('Parent call', async () => {
      await frontendLayer.open();

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

      await frontendLayer.close();
    });

    test('Batch queries', async () => {
      await frontendLayer.open();

      await frontendLayer.authenticator.signIn();

      const [movie1, movie2] = await frontendLayer.batch(() => {
        const ids = ['abc123', 'abc456'];

        return ids.map(async id => {
          await Promise.resolve(1);
          const movie = await frontendLayer.Movie.get(id);
          await Promise.resolve(1);
          movie.isMarked = true;
          return movie;
        });
      });

      expect(movie1.title).toBe('Inception');
      expect(movie1.year).toBe(2010);
      expect(movie1.ratingSum).toBe(9);
      expect(movie1.ratingCount).toBe(1);
      expect(movie1.isMarked).toBe(true);

      expect(movie2.title).toBe('The Matrix');
      expect(movie2.year).toBe(1999);
      expect(movie2.ratingSum).toBe(18);
      expect(movie2.ratingCount).toBe(2);
      expect(movie2.isMarked).toBe(true);

      await frontendLayer.authenticator.signOut();

      await frontendLayer.close();
    });
  });
}

runTests();
runTests({viaHTTP: true});

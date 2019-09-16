import {Layer, Registerable, Serializable, expose} from '../../..';
import {LayerHTTPClient} from '@liaison/layer-http-client';
import {LayerHTTPServer} from '@liaison/layer-http-server';

class BaseAuthenticator extends Serializable(Registerable()) {
  serialize() {
    return {
      ...super.serialize(),
      token: this.token
    };
  }

  deserialize({token} = {}) {
    this.token = token;
  }
}

class BaseMovie extends Serializable(Registerable()) {
  constructor(
    {title, year, ratingSum = 0, ratingCount = 0, ...object} = {},
    {isDeserializing} = {}
  ) {
    super(object, {isDeserializing});
    if (!isDeserializing) {
      this.title = title;
      this.year = year;
      this.ratingSum = ratingSum;
      this.ratingCount = ratingCount;
    }
    this.constructor.setInstance(this);
  }

  serialize() {
    return {
      ...super.serialize(),
      title: this.title,
      year: this.year,
      ratingSum: this.ratingSum,
      ratingCount: this.ratingCount
    };
  }

  deserialize({title, year, ratingSum, ratingCount} = {}) {
    this.title = title;
    this.year = year;
    this.ratingSum = ratingSum;
    this.ratingCount = ratingCount;
  }

  static getInstance(_object, _previousInstance) {
    // Let's simulate an identity map
    return this._instance;
  }

  static setInstance(instance) {
    // The identity map can contain one instance only
    this._instance = instance;
  }

  getAverageRating() {
    let rating = this.ratingSum / this.ratingCount;
    rating = Math.round(rating * 10) / 10;
    return rating;
  }
}

let layerServer;
let backendLayer;

beforeAll(async () => {
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
  class Movie extends BaseMovie {
    @expose() static get(id) {
      this.authorize();
      if (id === 'abc123') {
        return this.deserialize({title: 'Inception', year: 2010, ratingSum: 9, ratingCount: 1});
      }
      throw new Error(`Movie not found (id: '${id}')`);
    }

    @expose() rate(rating) {
      this.constructor.authorize();
      this.ratingSum += rating;
      this.ratingCount += 1;
    }

    static authorize() {
      const {token} = this.layer.authenticator;
      if (token !== '123456789') {
        throw new Error('Token is invalid');
      }
    }
  }

  const authenticator = expose()(Authenticator.deserialize());

  const layer = new Layer({authenticator, Movie}, {name: 'backend'});

  layerServer = new LayerHTTPServer(layer, {port: 4444});
  await layerServer.start();

  const layerClient = new LayerHTTPClient('http://localhost:4444');
  backendLayer = await layerClient.connect();
});

afterAll(async () => {
  await layerServer?.stop();
});

describe('Parent layer via HTTP', () => {
  test('Parent call', async () => {
    class Authenticator extends BaseAuthenticator {}

    class Movie extends BaseMovie {}

    const authenticator = Authenticator.deserialize();

    const layer = new Layer({authenticator, Movie}, {name: 'frontend', parent: backendLayer});

    expect(layer.authenticator.token).toBeUndefined();
    await layer.authenticator.signIn();
    expect(layer.authenticator.token).toBe('123456789');

    const movie = await layer.Movie.get('abc123');
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.year).toBe(2010);
    expect(movie.ratingSum).toBe(9);
    expect(movie.ratingCount).toBe(1);
    expect(movie.getAverageRating()).toBe(9);

    await movie.rate(7);
    expect(movie.ratingSum).toBe(16);
    expect(movie.ratingCount).toBe(2);
    expect(movie.getAverageRating()).toBe(8);

    expect(layer.authenticator.token).toBe('123456789');
    await layer.authenticator.signOut();
    expect(layer.authenticator.token).toBeUndefined();

    await expect(layer.Movie.get('abc123')).rejects.toThrow(/Token is invalid/);
  });
});

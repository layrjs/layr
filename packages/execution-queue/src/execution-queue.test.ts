import {Component, provide, primaryIdentifier, attribute, method} from '@layr/component';
import {ComponentServer} from '@layr/component-server';
import {sleep} from '@layr/utilities';

import {ExecutionQueue} from './execution-queue';

describe('ExecutionQueue', () => {
  test('Static method queuing', async () => {
    let taskStatus: string | undefined = undefined;

    class Application extends Component {
      @method({queue: true}) static async task() {
        taskStatus = 'running';
        await sleep(150);
        taskStatus = 'done';
      }
    }

    const componentServer = new ComponentServer(Application);

    const executionQueue = new ExecutionQueue(async (query) => {
      await sleep(10);
      componentServer.receive({query}, {executionMode: 'background'});
    });

    executionQueue.registerRootComponent(Application);

    expect(taskStatus).toBeUndefined();

    await Application.task();

    expect(taskStatus).toBe('running');

    await sleep(200);

    expect(taskStatus).toBe('done');
  });

  test('Instance method queuing', async () => {
    let movieStatus: string | undefined = undefined;

    class Movie extends Component {
      @primaryIdentifier() id!: string;

      @attribute('string') title!: string;

      @method({queue: true}) async play() {
        movieStatus = `playing (id: '${this.id}')`;
        await sleep(150);
        movieStatus = `played (id: '${this.id}')`;
      }
    }

    class Application extends Component {
      @provide() static Movie = Movie;
    }

    const componentServer = new ComponentServer(Application);

    const executionQueue = new ExecutionQueue(async (query) => {
      await sleep(10);
      componentServer.receive({query}, {executionMode: 'background'});
    });

    executionQueue.registerRootComponent(Application);

    const movie = new Application.Movie({id: 'movie1', title: 'Inception'});

    expect(movieStatus).toBeUndefined();

    await movie.play();

    expect(movieStatus).toBe("playing (id: 'movie1')");

    await sleep(200);

    expect(movieStatus).toBe("played (id: 'movie1')");
  });
});

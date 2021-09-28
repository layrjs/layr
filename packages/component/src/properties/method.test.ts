import {MINUTE, HOUR, DAY} from '@layr/utilities';

import {Component} from '../component';
import {Method} from './method';

describe('Method', () => {
  test('Creation', async () => {
    class Movie extends Component {}

    const method = new Method('find', Movie);

    expect(Method.isMethod(method)).toBe(true);
    expect(method.getName()).toBe('find');
    expect(method.getParent()).toBe(Movie);
  });

  test('Scheduling', async () => {
    class Movie extends Component {}

    const findMethod = new Method('find', Movie);

    expect(findMethod.getScheduling()).toBe(undefined);

    const updateRatingsMethod = new Method('updateRatings', Movie, {schedule: {rate: 1 * HOUR}});

    expect(updateRatingsMethod.getScheduling()).toEqual({rate: 1 * HOUR});

    expect(() => {
      new Method('play', Movie.prototype, {schedule: {rate: 1 * DAY}});
    }).toThrow("Only static methods can be scheduled (method: 'Movie.prototype.play')");
  });

  test('Queueing', async () => {
    class Movie extends Component {}

    const findMethod = new Method('find', Movie);

    expect(findMethod.getQueueing()).toBe(undefined);

    const updateRatingsMethod = new Method('updateRatings', Movie, {queue: true});

    expect(updateRatingsMethod.getQueueing()).toBe(true);

    const generateThumbnailMethod = new Method('generateThumbnail', Movie.prototype, {queue: true});

    expect(generateThumbnailMethod.getQueueing()).toBe(true);
  });

  test('Maximum duration', async () => {
    class Movie extends Component {}

    const findMethod = new Method('find', Movie);

    expect(findMethod.getMaximumDuration()).toBe(undefined);

    const updateRatingsMethod = new Method('updateRatings', Movie, {
      queue: true,
      maximumDuration: 1 * MINUTE
    });

    expect(updateRatingsMethod.getMaximumDuration()).toBe(1 * MINUTE);
  });
});

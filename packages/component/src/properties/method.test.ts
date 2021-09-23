import {HOUR, DAY} from '@layr/utilities';

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

  test('Schedule', async () => {
    class Movie extends Component {}

    const findMethod = new Method('find', Movie);

    expect(findMethod.getSchedule()).toBe(undefined);

    const updateRatingMethod = new Method('updateRating', Movie, {schedule: {rate: 1 * HOUR}});

    expect(updateRatingMethod.getSchedule()).toEqual({rate: 1 * HOUR});

    expect(() => {
      new Method('play', Movie.prototype, {schedule: {rate: 1 * DAY}});
    }).toThrow("Only static methods can be scheduled (method: 'Movie.prototype.play')");
  });
});

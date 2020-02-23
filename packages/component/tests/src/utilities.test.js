import {Component, isComponent, getComponentName, isComponentName} from '../../..';

describe('Utilities', () => {
  test('isComponent()', async () => {
    expect(isComponent(undefined)).toBe(false);
    expect(isComponent(null)).toBe(false);
    expect(isComponent(true)).toBe(false);
    expect(isComponent(1)).toBe(false);
    expect(isComponent({})).toBe(false);

    class Movie extends Component() {}

    expect(isComponent(Movie.prototype)).toBe(true);

    const movie = new Movie();

    expect(isComponent(movie)).toBe(true);
  });

  test('getComponentName()', async () => {
    class Movie extends Component() {}

    expect(getComponentName(Movie)).toBe('Movie');

    const movie = new Movie();

    expect(getComponentName(movie)).toBe('movie');

    expect(() => getComponentName({})).toThrow('The specified object is not a component');
  });

  test('isComponentName()', async () => {
    expect(isComponentName('Movie')).toBe(true);
    expect(isComponentName('movie')).toBe(true);
    expect(isComponentName('MotionPicture')).toBe(true);
    expect(isComponentName('motionPicture')).toBe(true);
    expect(isComponentName('Prefix_Movie')).toBe(true);
    expect(isComponentName('prefix_Movie')).toBe(true);

    expect(isComponentName('$Movie')).toBe(false);
    expect(isComponentName('_Movie')).toBe(false);
    expect(isComponentName('Movie!')).toBe(false);
    expect(isComponentName('1Place')).toBe(false);

    expect(isComponentName('Movie', {allowClasses: false})).toBe(false);
    expect(isComponentName('movie', {allowInstances: false})).toBe(false);

    expect(() => isComponentName(undefined)).toThrow();
    expect(() => isComponentName(1)).toThrow();
  });
});

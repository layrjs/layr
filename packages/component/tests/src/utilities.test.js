import {
  Component,
  isComponentClass,
  isComponentInstance,
  isComponentClassOrInstance,
  isComponentName,
  getTypeOf
} from '../../..';

describe('Utilities', () => {
  test('isComponentClass()', async () => {
    expect(isComponentClass(undefined)).toBe(false);
    expect(isComponentClass(null)).toBe(false);
    expect(isComponentClass(true)).toBe(false);
    expect(isComponentClass(1)).toBe(false);
    expect(isComponentClass({})).toBe(false);

    class Movie extends Component() {}

    expect(isComponentClass(Movie)).toBe(true);
    expect(isComponentClass(Movie.prototype)).toBe(false);

    const movie = new Movie();

    expect(isComponentClass(movie)).toBe(false);
  });

  test('isComponentInstance()', async () => {
    expect(isComponentInstance(undefined)).toBe(false);
    expect(isComponentInstance(null)).toBe(false);
    expect(isComponentInstance(true)).toBe(false);
    expect(isComponentInstance(1)).toBe(false);
    expect(isComponentInstance({})).toBe(false);

    class Movie extends Component() {}

    expect(isComponentInstance(Movie.prototype)).toBe(true);

    const movie = new Movie();

    expect(isComponentInstance(movie)).toBe(true);
  });

  test('isComponentClassOrInstance()', async () => {
    expect(isComponentClassOrInstance(undefined)).toBe(false);
    expect(isComponentClassOrInstance(null)).toBe(false);
    expect(isComponentClassOrInstance(true)).toBe(false);
    expect(isComponentClassOrInstance(1)).toBe(false);
    expect(isComponentClassOrInstance({})).toBe(false);

    class Movie extends Component() {}

    expect(isComponentClassOrInstance(Movie)).toBe(true);
    expect(isComponentClassOrInstance(Movie.prototype)).toBe(true);

    const movie = new Movie();

    expect(isComponentClassOrInstance(movie)).toBe(true);
  });

  test('isComponentName()', async () => {
    expect(isComponentName('Movie')).toBe('componentClassName');
    expect(isComponentName('movie')).toBe('componentInstanceName');
    expect(isComponentName('MotionPicture')).toBe('componentClassName');
    expect(isComponentName('motionPicture')).toBe('componentInstanceName');
    expect(isComponentName('Prefix_Movie')).toBe('componentClassName');
    expect(isComponentName('prefix_Movie')).toBe('componentInstanceName');

    expect(isComponentName('$Movie')).toBe(false);
    expect(isComponentName('_Movie')).toBe(false);
    expect(isComponentName('Movie!')).toBe(false);
    expect(isComponentName('1Place')).toBe(false);

    expect(isComponentName('Movie', {allowClasses: false})).toBe(false);
    expect(isComponentName('movie', {allowInstances: false})).toBe(false);

    expect(() => isComponentName(undefined)).toThrow();
    expect(() => isComponentName(1)).toThrow();
  });

  test('getTypeOf()', async () => {
    class Movie extends Component() {}

    const movie = new Movie();

    expect(getTypeOf(Movie)).toBe('Movie');
    expect(getTypeOf(movie)).toBe('movie');

    Movie.setComponentName('Film');

    expect(getTypeOf(Movie)).toBe('Film');
    expect(getTypeOf(movie)).toBe('film');
  });
});

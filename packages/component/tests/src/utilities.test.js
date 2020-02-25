import {
  Component,
  isComponentClass,
  isComponent,
  getComponentName,
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

  test('getTypeOf()', async () => {
    class Movie extends Component() {}

    const movie = new Movie();

    expect(getTypeOf(Movie)).toBe('Movie');
    expect(getTypeOf(movie)).toBe('movie');

    Movie.setName('Film');

    expect(getTypeOf(Movie)).toBe('Film');
    expect(getTypeOf(movie)).toBe('film');
  });
});

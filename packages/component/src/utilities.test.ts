import {Component} from './component';
import {
  isComponentClass,
  isComponentInstance,
  isComponentClassOrInstance,
  isComponentName,
  isComponentType
} from './utilities';

describe('Utilities', () => {
  test('isComponentClass()', async () => {
    expect(isComponentClass(undefined)).toBe(false);
    expect(isComponentClass(null)).toBe(false);
    expect(isComponentClass(true)).toBe(false);
    expect(isComponentClass(1)).toBe(false);
    expect(isComponentClass({})).toBe(false);

    class Movie extends Component {}

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

    class Movie extends Component {}

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

    class Movie extends Component {}

    expect(isComponentClassOrInstance(Movie)).toBe(true);
    expect(isComponentClassOrInstance(Movie.prototype)).toBe(true);

    const movie = new Movie();

    expect(isComponentClassOrInstance(movie)).toBe(true);
  });

  test('isComponentName()', async () => {
    expect(isComponentName('Movie')).toBe(true);
    expect(isComponentName('Movie2')).toBe(true);
    expect(isComponentName('MotionPicture')).toBe(true);
    expect(isComponentName('Prefix_Movie')).toBe(true);

    expect(isComponentName('$Movie')).toBe(false);
    expect(isComponentName('_Movie')).toBe(false);
    expect(isComponentName('Movie!')).toBe(false);
    expect(isComponentName('1Place')).toBe(false);
  });

  test('isComponentType()', async () => {
    expect(isComponentType('typeof Movie')).toBe('componentClassType');
    expect(isComponentType('Movie')).toBe('componentInstanceType');
    expect(isComponentType('typeof MotionPicture')).toBe('componentClassType');
    expect(isComponentType('MotionPicture')).toBe('componentInstanceType');
    expect(isComponentType('typeof Prefix_Movie')).toBe('componentClassType');
    expect(isComponentType('Prefix_Movie')).toBe('componentInstanceType');

    expect(isComponentType('$Movie')).toBe(false);
    expect(isComponentType('_Movie')).toBe(false);
    expect(isComponentType('Movie!')).toBe(false);
    expect(isComponentType('1Place')).toBe(false);

    expect(isComponentType('typeof Movie', {allowClasses: false})).toBe(false);
    expect(isComponentType('Movie', {allowInstances: false})).toBe(false);
  });
});

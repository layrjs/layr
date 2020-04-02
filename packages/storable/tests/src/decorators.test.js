import {Storable, attribute, isStorableAttribute} from '../../..';

describe('Decorators', () => {
  test('@attribute()', async () => {
    class Movie extends Storable {
      @attribute('number', {beforeLoad: () => {}}) static limit = 100;

      @attribute('string', {beforeSave: () => {}}) title = '';
    }

    const limitAttribute = Movie.getAttribute('limit');

    expect(isStorableAttribute(limitAttribute)).toBe(true);
    expect(limitAttribute.getName()).toBe('limit');
    expect(limitAttribute.getParent()).toBe(Movie);
    expect(limitAttribute.hasHook('beforeLoad')).toBe(true);
    expect(limitAttribute.hasHook('beforeSave')).toBe(false);

    const titleAttribute = Movie.prototype.getAttribute('title');

    expect(isStorableAttribute(titleAttribute)).toBe(true);
    expect(titleAttribute.getName()).toBe('title');
    expect(titleAttribute.getParent()).toBe(Movie.prototype);
    expect(titleAttribute.hasHook('beforeSave')).toBe(true);
    expect(titleAttribute.hasHook('beforeLoad')).toBe(false);
  });
});

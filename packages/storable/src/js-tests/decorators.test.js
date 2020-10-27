import {Component} from '@layr/component';

import {Storable} from '../storable';
import {attribute, method, loader, finder} from '../decorators';
import {isStorableAttributeInstance, isStorableMethodInstance} from '../properties';

describe('Decorators', () => {
  test('@attribute()', async () => {
    const beforeLoadHook = function () {};
    const beforeSaveHook = function () {};

    class Movie extends Storable(Component) {
      @attribute('number', {beforeLoad: beforeLoadHook}) static limit = 100;

      @attribute('string', {beforeSave: beforeSaveHook}) title = '';
    }

    const limitAttribute = Movie.getStorableAttribute('limit');

    expect(isStorableAttributeInstance(limitAttribute)).toBe(true);
    expect(limitAttribute.getName()).toBe('limit');
    expect(limitAttribute.getParent()).toBe(Movie);
    expect(limitAttribute.getHook('beforeLoad')).toBe(beforeLoadHook);
    expect(limitAttribute.hasHook('beforeLoad')).toBe(true);
    expect(limitAttribute.hasHook('beforeSave')).toBe(false);

    const titleAttribute = Movie.prototype.getStorableAttribute('title');

    expect(isStorableAttributeInstance(titleAttribute)).toBe(true);
    expect(titleAttribute.getName()).toBe('title');
    expect(titleAttribute.getParent()).toBe(Movie.prototype);
    expect(titleAttribute.getHook('beforeSave')).toBe(beforeSaveHook);
    expect(titleAttribute.hasHook('beforeSave')).toBe(true);
    expect(titleAttribute.hasHook('beforeLoad')).toBe(false);
  });

  test('@loader()', async () => {
    const limitLoader = function () {};
    const titleLoader = function () {};

    class Movie extends Storable(Component) {
      @loader(limitLoader) @attribute('number?') static limit;

      @loader(titleLoader) @attribute('string') title = '';
    }

    const limitAttribute = Movie.getStorableAttribute('limit');

    expect(isStorableAttributeInstance(limitAttribute)).toBe(true);
    expect(limitAttribute.getName()).toBe('limit');
    expect(limitAttribute.getParent()).toBe(Movie);
    expect(limitAttribute.getLoader()).toBe(limitLoader);
    expect(limitAttribute.hasLoader()).toBe(true);

    const titleAttribute = Movie.prototype.getStorableAttribute('title');

    expect(isStorableAttributeInstance(titleAttribute)).toBe(true);
    expect(titleAttribute.getName()).toBe('title');
    expect(titleAttribute.getParent()).toBe(Movie.prototype);
    expect(titleAttribute.getLoader()).toBe(titleLoader);
    expect(titleAttribute.hasLoader()).toBe(true);
  });

  test('@finder()', async () => {
    const hasNoAccessFinder = function () {
      return {};
    };
    const hasAccessLevelFinder = function () {
      return {};
    };

    class Movie extends Storable(Component) {
      @finder(hasNoAccessFinder) @attribute('boolean?') hasNoAccess;
      @finder(hasAccessLevelFinder) @method() hasAccessLevel() {}
    }

    const hasNoAccessAttribute = Movie.prototype.getStorableAttribute('hasNoAccess');

    expect(isStorableAttributeInstance(hasNoAccessAttribute)).toBe(true);
    expect(hasNoAccessAttribute.getName()).toBe('hasNoAccess');
    expect(hasNoAccessAttribute.getParent()).toBe(Movie.prototype);
    expect(hasNoAccessAttribute.getFinder()).toBe(hasNoAccessFinder);
    expect(hasNoAccessAttribute.hasFinder()).toBe(true);

    const hasAccessLevelMethod = Movie.prototype.getStorableMethod('hasAccessLevel');

    expect(isStorableMethodInstance(hasAccessLevelMethod)).toBe(true);
    expect(hasAccessLevelMethod.getName()).toBe('hasAccessLevel');
    expect(hasAccessLevelMethod.getParent()).toBe(Movie.prototype);
    expect(hasAccessLevelMethod.getFinder()).toBe(hasAccessLevelFinder);
    expect(hasAccessLevelMethod.hasFinder()).toBe(true);
  });
});

import {Component} from '@liaison/component';

import {WithRoles, isWithRoles} from '../../..';

describe('WithRoles', () => {
  test('WithRoles()', async () => {
    class Movie extends WithRoles(Component) {}

    expect(isWithRoles(Movie)).toBe(true);
    expect(isWithRoles(Movie.prototype)).toBe(true);
  });

  test('normalizePropertyOperationSetting()', async () => {
    class Movie extends WithRoles(Component) {}

    expect(Movie.normalizePropertyOperationSetting(true)).toBe(true);
    expect(Movie.normalizePropertyOperationSetting('admin')).toEqual(['admin']);
    expect(Movie.normalizePropertyOperationSetting(['user', 'guest'])).toEqual(['user', 'guest']);
    expect(Movie.normalizePropertyOperationSetting([])).toBeUndefined();
    expect(Movie.normalizePropertyOperationSetting([''])).toBeUndefined();

    expect(() => Movie.normalizePropertyOperationSetting(undefined)).toThrow(
      'The specified property operation setting (undefined) is invalid'
    );
    expect(() => Movie.normalizePropertyOperationSetting(false)).toThrow(
      'The specified property operation setting (false) is invalid'
    );
    expect(() => Movie.normalizePropertyOperationSetting(1)).toThrow(
      'The specified property operation setting (1) is invalid'
    );
    expect(() => Movie.normalizePropertyOperationSetting({admin: true})).toThrow(
      'The specified property operation setting ({"admin":true}) is invalid'
    );
    expect(() => Movie.normalizePropertyOperationSetting([false])).toThrow(
      'The specified property operation setting ([false]) is invalid'
    );

    expect(
      Movie.normalizePropertyOperationSetting(undefined, {throwIfInvalid: false})
    ).toBeUndefined();
  });

  test('resolvePropertyOperationSetting()', async () => {
    class Movie extends WithRoles(Component) {}

    expect(Movie.resolvePropertyOperationSetting(true)).toBe(true);
    expect(Movie.prototype.resolvePropertyOperationSetting(true)).toBe(true);

    // eslint-disable-next-line prefer-const
    let user;

    const resolver = async () => user !== undefined;

    Movie.setRole('user', resolver);

    expect(await Movie.resolvePropertyOperationSetting(['user'])).toBe(false);

    Movie.setRole('user', resolver); // Reset the role cache

    user = {id: 'abc123'};

    expect(await Movie.resolvePropertyOperationSetting(['user'])).toBe(true);
  });

  test('getRole()', async () => {
    class Movie extends WithRoles(Component) {}

    expect(() => Movie.getRole('anyone')).toThrow(
      "The role 'anyone' is missing (component name: 'Movie')"
    );
    expect(Movie.getRole('anyone', {throwIfMissing: false})).toBeUndefined();

    const role = Movie.setRole('anyone', () => true);

    expect(Movie.getRole('anyone')).toBe(role);
    expect(Movie.prototype.getRole('anyone', {throwIfMissing: false})).toBeUndefined();
    expect(Movie.prototype.getRole('anyone', {fallbackToClass: true})).toBe(role);

    const ForkedMovie = Movie.fork();

    const forkedRole = ForkedMovie.getRole('anyone');

    expect(forkedRole).not.toBe(role);
    expect(forkedRole.isForkOf(role)).toBe(true);
  });

  test('setRole()', async () => {
    class Movie extends WithRoles(Component) {}

    const authorRole = Movie.prototype.setRole('author', () => true);

    expect(Movie.prototype.getRole('author')).toBe(authorRole);
    expect(Movie.getRole('author', {throwIfMissing: false})).toBeUndefined();

    class Film extends Movie {}

    expect(Film.prototype.getRole('author').isForkOf(authorRole)).toBe(true);

    const adminRole = Film.prototype.setRole('admin', () => true);

    expect(Film.prototype.getRole('admin')).toBe(adminRole);
    expect(Movie.prototype.getRole('admin', {throwIfMissing: false})).toBeUndefined();
  });

  test('resolveRole()', async () => {
    class Movie extends WithRoles(Component) {}

    Movie.setRole('anyone', () => true);
    Movie.setRole('admin', () => false);

    expect(Movie.resolveRole('anyone')).toBe(true);
    expect(Movie.resolveRole('admin')).toBe(false);
    expect(Movie.prototype.resolveRole('anyone')).toBe(true);
    expect(Movie.prototype.resolveRole('admin')).toBe(false);
  });

  test('getRoles()', async () => {
    class Movie extends WithRoles(Component) {}

    expect(Array.from(Movie.getRoles())).toEqual([]);

    const anyoneRole = Movie.setRole('anyone', () => true);

    expect(Array.from(Movie.getRoles())).toEqual([anyoneRole]);

    const adminRole = Movie.setRole('admin', () => false);

    expect(Array.from(Movie.getRoles())).toEqual([anyoneRole, adminRole]);
  });
});

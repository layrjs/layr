import {Component} from '@layr/component';

import {WithRoles} from './with-roles';

describe('WithRoles', () => {
  test('normalizePropertyOperationSetting()', async () => {
    class Movie extends WithRoles(Component) {}

    expect(Movie.normalizePropertyOperationSetting(true)).toBe(true);
    expect(Movie.normalizePropertyOperationSetting('admin')).toEqual(['admin']);
    expect(Movie.normalizePropertyOperationSetting(['user', 'guest'])).toEqual(['user', 'guest']);
    expect(Movie.normalizePropertyOperationSetting([])).toBeUndefined();
    expect(Movie.normalizePropertyOperationSetting([''])).toBeUndefined();

    // @ts-expect-error
    expect(() => Movie.normalizePropertyOperationSetting(undefined)).toThrow(
      'The specified property operation setting (undefined) is invalid'
    );
    expect(() => Movie.normalizePropertyOperationSetting(false)).toThrow(
      'The specified property operation setting (false) is invalid'
    );
    // @ts-expect-error
    expect(() => Movie.normalizePropertyOperationSetting(1)).toThrow(
      'The specified property operation setting (1) is invalid'
    );
    // @ts-expect-error
    expect(() => Movie.normalizePropertyOperationSetting({admin: true})).toThrow(
      'The specified property operation setting ({"admin":true}) is invalid'
    );
    // @ts-expect-error
    expect(() => Movie.normalizePropertyOperationSetting([false])).toThrow(
      'The specified property operation setting ([false]) is invalid'
    );

    expect(
      // @ts-expect-error
      Movie.normalizePropertyOperationSetting(undefined, {throwIfInvalid: false})
    ).toBeUndefined();
  });

  test('resolvePropertyOperationSetting()', async () => {
    class Movie extends WithRoles(Component) {}

    expect(Movie.resolvePropertyOperationSetting(true)).toBe(true);
    expect(Movie.prototype.resolvePropertyOperationSetting(true)).toBe(true);

    let user: any;

    const resolver = async () => user !== undefined;

    Movie.setRole('user', resolver);

    expect(await Movie.resolvePropertyOperationSetting(['user'])).toBe(false);

    Movie.setRole('user', resolver); // Reset the role cache

    user = {id: 'abc123'};

    expect(await Movie.resolvePropertyOperationSetting(['user'])).toBe(true);
  });

  test('getRole() and hasRole()', async () => {
    class Movie extends WithRoles(Component) {}

    expect(() => Movie.getRole('anyone')).toThrow(
      "The role 'anyone' is missing (component: 'Movie')"
    );
    expect(Movie.hasRole('anyone')).toBe(false);

    const role = Movie.setRole('anyone', () => true);

    expect(Movie.getRole('anyone')).toBe(role);
    expect(Movie.prototype.hasRole('anyone')).toBe(false);
    expect(Movie.prototype.getRole('anyone', {fallbackToClass: true})).toBe(role);

    const MovieFork = Movie.fork();

    const roleFork = MovieFork.getRole('anyone');

    expect(roleFork).not.toBe(role);
    expect(roleFork.isForkOf(role)).toBe(true);
  });

  test('setRole()', async () => {
    class Movie extends WithRoles(Component) {}

    const authorRole = Movie.prototype.setRole('author', () => true);

    expect(Movie.prototype.getRole('author')).toBe(authorRole);
    expect(Movie.hasRole('author')).toBe(false);

    class Film extends Movie {}

    expect(Film.prototype.getRole('author').isForkOf(authorRole)).toBe(true);

    const adminRole = Film.prototype.setRole('admin', () => true);

    expect(Film.prototype.getRole('admin')).toBe(adminRole);
    expect(Movie.prototype.hasRole('admin')).toBe(false);
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

import {Component} from '@liaison/component';

import {WithRoles} from './with-roles';
import {Role} from './role';
import {isRoleInstance} from './utilities';

describe('Role', () => {
  test('new Role()', async () => {
    class Movie extends WithRoles(Component) {}

    const resolver = () => true;

    const role = new Role('anyone', Movie, resolver);

    expect(isRoleInstance(role)).toBe(true);

    expect(role.getName()).toBe('anyone');
    expect(role.getParent()).toBe(Movie);
    expect(role.getResolver()).toBe(resolver);
  });

  test('resolve()', async () => {
    class Movie extends WithRoles(Component) {}

    const resolver = jest.fn(async function (this: unknown) {
      expect(this).toBe(Movie);

      return true;
    });

    const role = new Role('anyone', Movie, resolver);

    expect(resolver).toHaveBeenCalledTimes(0);

    let result = await role.resolve();

    expect(result).toBe(true);
    expect(resolver).toHaveBeenCalledTimes(1);

    // Let's make sure the resolver result has been cached
    result = await role.resolve();

    expect(result).toBe(true);
    expect(resolver).toHaveBeenCalledTimes(1);
  });

  test('fork() and isForkOf()', async () => {
    class Movie extends WithRoles(Component) {}

    const resolver = () => true;

    const role = new Role('anyone', Movie, resolver);

    expect(role.getName()).toBe('anyone');
    expect(role.getParent()).toBe(Movie);
    expect(role.getResolver()).toBe(resolver);

    const ForkedMovie = Movie.fork();

    const forkedRole = role.fork(ForkedMovie);

    expect(forkedRole).not.toBe(role);
    expect(forkedRole.getName()).toBe('anyone');
    expect(forkedRole.getParent()).toBe(ForkedMovie);
    expect(forkedRole.getResolver()).toBe(resolver);

    expect(forkedRole.isForkOf(role)).toBe(true);
    expect(role.isForkOf(forkedRole)).toBe(false);
  });
});

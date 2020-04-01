import {Component} from '@liaison/component';

import {WithRoles, isRole, role} from '../../..';

describe('Decorators', () => {
  test('@role()', async () => {
    class Movie extends WithRoles(Component) {
      @role('anyone') static anyoneRoleResolver() {
        return true;
      }

      @role('author') authorRoleResolver() {
        return false;
      }
    }

    const anyoneRole = Movie.getRole('anyone');

    expect(isRole(anyoneRole)).toBe(true);
    expect(anyoneRole.getParent()).toBe(Movie);
    expect(anyoneRole.getName()).toBe('anyone');
    expect(anyoneRole.getResolver()).toBe(Movie.anyoneRoleResolver);

    const authorRole = Movie.prototype.getRole('author');

    expect(isRole(authorRole)).toBe(true);
    expect(authorRole.getParent()).toBe(Movie.prototype);
    expect(authorRole.getName()).toBe('author');
    expect(authorRole.getResolver()).toBe(Movie.prototype.authorRoleResolver);
  });
});

import {Component} from '@liaison/component';

import {WithRoles} from './with-roles';
import {role} from './decorators';
import {isRoleInstance} from './utilities';

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

    expect(isRoleInstance(anyoneRole)).toBe(true);
    expect(anyoneRole.getName()).toBe('anyone');
    expect(anyoneRole.getParent()).toBe(Movie);
    expect(anyoneRole.getResolver()).toBe(Movie.anyoneRoleResolver);

    const authorRole = Movie.prototype.getRole('author');

    expect(isRoleInstance(authorRole)).toBe(true);
    expect(authorRole.getName()).toBe('author');
    expect(authorRole.getParent()).toBe(Movie.prototype);
    expect(authorRole.getResolver()).toBe(Movie.prototype.authorRoleResolver);
  });
});

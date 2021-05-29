import {expose} from '@layr/component';
import {attribute} from '@layr/storable';
import {role} from '@layr/with-roles';

import type {Entity} from './entity';
import type {User} from './user';

export const WithAuthor = (Base: typeof Entity) => {
  class WithAuthor extends Base {
    ['constructor']!: typeof WithAuthor;

    @expose({get: true, set: 'author'}) @attribute('User') author!: User;

    @role('author') async authorRoleResolver() {
      if (await this.resolveRole('guest')) {
        return undefined;
      }

      if (this.isNew()) {
        return true;
      }

      await this.getGhost().load({author: {}});

      return (
        this.getGhost().author === (await this.constructor.User.getAuthenticatedUser())!.getGhost()
      );
    }
  }

  return WithAuthor;
};

import {field, role} from '@liaison/liaison';
import {WithAuthor as BaseWithAuthor} from '@liaison/liaison-website-shared';

export const WithAuthor = Base =>
  class WithAuthor extends BaseWithAuthor(Base) {
    @field({expose: {get: 'anyone'}}) author;

    @role('author') async authorRoleResolver() {
      if (this.$resolveRole('creator') || this.$resolveRole('guest')) {
        return undefined;
      }

      await this.$ghost.$load({fields: {author: {}}});

      return this.$ghost.author === this.$layer.session.user.$ghost;
    }

    async $beforeSave() {
      await super.$beforeSave();

      if (this.$isNew()) {
        this.author = this.$layer.session.user;
      }
    }
  };

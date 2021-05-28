import {Component, consume, expose, AttributeSelector} from '@layr/component';
import {Storable, primaryIdentifier, attribute, index} from '@layr/storable';
import {WithRoles, role} from '@layr/with-roles';

import type {User} from './user';

export class Entity extends WithRoles(Storable(Component)) {
  @consume() static User: typeof User;

  @expose({get: true, set: true}) @primaryIdentifier() id!: string;

  @expose({get: true}) @index() @attribute('Date') createdAt = new Date();

  @attribute('Date?') updatedAt?: Date;

  @role('user') static userRoleResolver() {
    return this.User.authenticatedUser !== undefined;
  }

  @role('guest') static guestRoleResolver() {
    return !this.resolveRole('user');
  }

  async beforeSave(attributeSelector: AttributeSelector) {
    await super.beforeSave(attributeSelector);

    this.updatedAt = new Date();
  }
}

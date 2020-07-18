import {Component, consume, expose, AttributeSelector} from '@liaison/component';
import {Storable, primaryIdentifier, attribute} from '@liaison/storable';
import {WithRoles, role} from '@liaison/with-roles';

import {Session} from './session';

export class Entity extends WithRoles(Storable(Component)) {
  @consume() static Session: typeof Session;

  @expose({get: true, set: true}) @primaryIdentifier() id!: string;

  @expose({get: 'anyone'}) @attribute('Date') createdAt = new Date();

  @attribute('Date?') updatedAt?: Date;

  @role('anyone') static anyoneRoleResolver() {
    return true;
  }

  @role('user') static userRoleResolver() {
    return this.Session.user !== undefined;
  }

  @role('guest') static guestRoleResolver() {
    return !this.resolveRole('user');
  }

  async beforeSave(attributeSelector: AttributeSelector) {
    await super.beforeSave(attributeSelector);

    this.updatedAt = new Date();
  }
}

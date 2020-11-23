import {Component, consume, expose, AttributeSelector} from '@layr/component';
import {Storable, primaryIdentifier, attribute} from '@layr/storable';
import {WithRoles, role} from '@layr/with-roles';

import type {Session} from './session';

export class Entity extends WithRoles(Storable(Component)) {
  @consume() static Session: typeof Session;

  @expose({get: true, set: true}) @primaryIdentifier() id!: string;

  @expose({get: true}) @attribute('Date') createdAt = new Date();

  @attribute('Date?') updatedAt?: Date;

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

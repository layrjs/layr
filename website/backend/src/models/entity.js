import {Storable, field, WithRoles, role} from '@liaison/liaison';
import {Entity as BaseEntity} from '@liaison/liaison-website-shared';

export class Entity extends Storable(WithRoles(BaseEntity), {storeName: 'store'}) {
  @field({expose: {get: 'anyone'}}) createdAt;

  @field() updatedAt;

  @role('anyone') static anyoneRoleResolver() {
    return true;
  }

  @role('creator') creatorRoleResolver() {
    return this.$isNew();
  }

  @role('user') static userRoleResolver() {
    return this.$layer.session.user !== undefined;
  }

  @role('guest') static guestRoleResolver() {
    return !this.$resolveRole('user');
  }

  async $beforeSave() {
    await super.$beforeSave();

    if (this.$isNew()) {
      this.createdAt = new Date();
    } else {
      this.updatedAt = new Date();
    }
  }
}

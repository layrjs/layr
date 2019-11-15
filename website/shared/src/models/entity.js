import {Storable, Entity as BaseEntity, field} from '@liaison/liaison';

export class Entity extends Storable(BaseEntity) {
  @field('Date') createdAt;

  @field('Date?') updatedAt;
}

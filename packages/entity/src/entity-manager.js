import {hasOwnProperty} from 'core-helpers';
import ow from 'ow';

export class EntityManager {
  constructor(parent) {
    ow(parent, 'parent', ow.function);

    this._parent = parent;
  }

  getParent() {
    return this._parent;
  }

  fork(parent) {
    ow(parent, 'parent', ow.function);

    const forkedEntityManager = Object.create(this);
    forkedEntityManager._parent = parent;
    return forkedEntityManager;
  }

  // === Entities ===

  getEntity(identifiers = {}) {
    ow(identifiers, 'identifiers', ow.object);

    const Entity = this.getParent();

    if (Entity.isDetached()) {
      return undefined;
    }

    for (const identifierAttribute of Entity.prototype.getIdentifierAttributes()) {
      const name = identifierAttribute.getName();
      const value = identifiers[name];

      if (value === undefined) {
        continue;
      }

      const index = this._getIndex(name);

      let entity = index[value];

      if (entity === undefined) {
        continue;
      }

      if (!hasOwnProperty(index, value)) {
        // The entity's class has been forked
        entity = entity.fork(Entity);
        this.addEntity(entity);
      }

      return entity;
    }
  }

  addEntity(entity) {
    ow(entity, 'entity', ow.object);

    if (entity.isDetached()) {
      throw new Error(
        `Cannot add a detached entity to the entity manager (${entity.describeComponent()})`
      );
    }

    for (const identifierAttribute of entity.getIdentifierAttributes({
      setAttributesOnly: true
    })) {
      const name = identifierAttribute.getName();
      const value = identifierAttribute.getValue();
      const index = this._getIndex(name);

      if (hasOwnProperty(index, value)) {
        throw new Error(
          `An entity with the same identifier already exists (${index[
            value
          ].describeComponent()}, attribute name: '${name}')`
        );
      }

      index[value] = entity;
    }
  }

  updateEntity(entity, attributeName, {previousValue, newValue}) {
    ow(entity, 'entity', ow.object);
    ow(attributeName, 'attributeName', ow.string.nonEmpty);

    if (entity.isDetached()) {
      return;
    }

    if (newValue === previousValue) {
      return;
    }

    const index = this._getIndex(attributeName);

    if (previousValue !== undefined) {
      delete index[previousValue];
    }

    if (newValue !== undefined) {
      if (newValue in index) {
        throw new Error(
          `An entity with the same identifier already exists (${entity.describeComponent()}, attribute name: '${attributeName}')`
        );
      }

      index[newValue] = entity;
    }
  }

  removeEntity(entity) {
    ow(entity, 'entity', ow.object);

    if (entity.isDetached()) {
      throw new Error(
        `Cannot remove a detached entity from the entity manager (${entity.describeComponent()})`
      );
    }

    for (const identifierAttribute of entity.getIdentifierAttributes({
      setAttributesOnly: true
    })) {
      const name = identifierAttribute.getName();
      const value = identifierAttribute.getValue();
      const index = this._getIndex(name);
      delete index[value];
    }
  }

  // === Indexes ===

  _getIndex(name) {
    const indexes = this._getIndexes();

    if (!indexes[name]) {
      indexes[name] = Object.create(null);
    } else if (!hasOwnProperty(indexes, name)) {
      indexes[name] = Object.create(indexes[name]);
    }

    return indexes[name];
  }

  _getIndexes() {
    if (!this._indexes) {
      this._indexes = Object.create(null);
    } else if (!hasOwnProperty(this, '_indexes')) {
      this._indexes = Object.create(this._indexes);
    }

    return this._indexes;
  }
}

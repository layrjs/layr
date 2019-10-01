import {FieldMask} from '@liaison/model';
import LRUMapModule from 'lru_map';
const LRUMap = LRUMapModule.LRUMap; // Turn around an issue when bundling with Rollup

/* eslint-disable guard-for-in */

export class Cache {
  constructor(parent, {size}) {
    this._parent = parent;
    this._size = size;

    this._entries = new LRUMap(size);

    this._indexes = Object.create(null);
    const uniqueFields = parent.prototype.$getUniqueFields();
    for (const uniqueField of uniqueFields) {
      const name = uniqueField.getName();
      this._indexes[name] = new Map();
    }
  }

  load(storables, {fields}) {
    const missingStorables = [];
    let missingFields = new FieldMask();

    for (const storable of storables) {
      const storableMissingFields = (() => {
        const entry = this._entries.get(storable.id);

        if (!entry) {
          return fields;
        }

        const {missingFields} = storable.$deserialize(entry.serializedStorable, {fields});

        return missingFields;
      })();

      if (storableMissingFields) {
        missingStorables.push(storable);
        missingFields = FieldMask.add(missingFields, storableMissingFields);
      }
    }

    return {missingStorables, missingFields};
  }

  save(storables) {
    for (const storable of storables) {
      let entry = this._entries.get(storable.id);

      if (!entry) {
        entry = {indexedFields: Object.create(null)};
      }

      entry.serializedStorable = storable.$serialize();
      this._updateIndexes(storable, entry.indexedFields);
      this._entries.set(storable.id, entry);
    }
  }

  delete(storables) {
    for (const storable of storables) {
      const entry = this._entries.get(storable.id);

      if (entry) {
        this._deleteIndexes(entry.indexedFields);
        this._entries.delete(storable.id);
      }
    }
  }

  find(name, values) {
    const storables = [];
    const missingValues = [];

    const index = this._indexes[name];

    if (!index) {
      throw new Error(`Index not found (name: '${name}')`);
    }

    for (const value of values) {
      const id = index.get(value);
      if (id !== undefined) {
        storables.push(this._parent.$deserialize({_id: id, [name]: value}));
      } else {
        missingValues.push(value);
      }
    }

    return {storables, missingValues};
  }

  _updateIndexes(storable, indexedFields) {
    for (const [name, index] of Object.entries(this._indexes)) {
      const value = storable.$getField(name).getValue({throwIfInactive: false});
      const indexedValue = indexedFields[name];

      if (value !== indexedValue) {
        if (indexedValue !== undefined) {
          index.delete(indexedValue);
        }
        if (value !== undefined) {
          index.set(value, storable.id);
        }
        indexedFields[name] = value;
      }
    }
  }

  _deleteIndexes(indexedFields) {
    for (const [name, index] of Object.entries(this._indexes)) {
      const indexedValue = indexedFields[name];

      if (indexedValue !== undefined) {
        index.delete(indexedValue);
      }
    }
  }
}

import {FieldMask} from '@liaison/model';
import QuickLRU from 'quick-lru';

export class Cache {
  constructor({size}) {
    this._items = new QuickLRU({maxSize: size});
  }

  load(storables, {fields}) {
    const missingStorables = [];
    let missingFields = new FieldMask({});

    for (const storable of storables) {
      const storableMissingFields = this.loadOne(storable, {fields});
      if (!storableMissingFields.isEmpty()) {
        missingStorables.push(storable);
        missingFields = FieldMask.add(missingFields, storableMissingFields);
      }
    }

    return {missingStorables, missingFields};
  }

  loadOne(storable, {fields}) {
    const item = this._items.get(storable.id);

    if (!item) {
      return fields;
    }

    storable.$deserialize(item.storable, {fields});
    const missingFields = FieldMask.remove(fields, item.fields);

    return missingFields;
  }

  save(storables, {fields}) {
    for (const storable of storables) {
      this.saveOne(storable, {fields});
    }
  }

  saveOne(storable, {fields}) {
    let item = this._items.get(storable.id);

    if (item) {
      fields = FieldMask.add(item.fields, fields);
    } else {
      item = {};
      this._items.set(storable.id, item);
    }

    item.storable = storable.$serialize({fields});
    item.fields = fields;
  }

  delete(storables) {
    for (const storable of storables) {
      this.deleteOne(storable);
    }
  }

  deleteOne(storable) {
    this._items.delete(storable.id);
  }
}

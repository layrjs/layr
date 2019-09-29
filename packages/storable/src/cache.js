import {FieldMask} from '@liaison/model';
import QuickLRU from 'quick-lru';

export class Cache {
  constructor({size}) {
    this._storables = new QuickLRU({maxSize: size});
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
    const cachedStorable = this._storables.get(storable.id);

    if (!cachedStorable) {
      return fields;
    }

    const {missingFields} = storable.$deserialize(cachedStorable, {fields});

    return missingFields;
  }

  save(storables) {
    for (const storable of storables) {
      this.saveOne(storable);
    }
  }

  saveOne(storable) {
    // TODO: Consider merging the existing cached storable with the saved one

    this._storables.set(storable.id, storable.$serialize());
  }

  delete(storables) {
    for (const storable of storables) {
      this.deleteOne(storable);
    }
  }

  deleteOne(storable) {
    this._storables.delete(storable.id);
  }
}

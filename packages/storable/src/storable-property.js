export const StorablePropertyMixin = Base =>
  class StorableProperty extends Base {
    // === Finder ===

    hasFinder() {
      return false; // TODO
    }

    // === Utilities ===

    isComputed() {
      return this.hasFinder();
    }
  };

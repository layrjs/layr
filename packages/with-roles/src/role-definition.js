import {possiblyAsync} from 'possibly-async';
import {inspect} from 'util';
import ow from 'ow';

export class RoleDefinition {
  constructor(parent, name, resolver, options = {}) {
    ow(parent, ow.object);
    ow(name, ow.string.nonEmpty);
    ow(options, ow.object);

    const {...unknownOptions} = options;

    const unknownOption = Object.keys(unknownOptions)[0];
    if (unknownOption) {
      throw new Error(`'${unknownOption}' option is unknown (role definition: '${name}')`);
    }

    this._parent = parent;
    this._name = name;
    this._resolver = resolver;
  }

  $fork(parent) {
    const forkedRoleDefinition = Object.create(this);
    forkedRoleDefinition._parent = parent;
    return forkedRoleDefinition;
  }

  $getParent() {
    return this._parent;
  }

  $getName() {
    return this._name;
  }

  $getResolver() {
    return this._resolver;
  }

  $resolve() {
    if (this._hasBeenResolved) {
      return this._resolvedValue;
    }

    return possiblyAsync(this._resolver.call(this._parent), {
      then: resolvedValue => {
        this._resolvedValue = resolvedValue;
        this._hasBeenResolved = true;
        return resolvedValue;
      }
    });
  }

  [inspect.custom]() {
    return {name: this._name, resolver: this._resolver};
  }
}

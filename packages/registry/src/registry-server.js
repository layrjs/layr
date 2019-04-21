import {invokeQuery} from '@deepr/runtime';
import debugModule from 'debug';

const debug = debugModule('registry-server');

export class RegistryServer {
  constructor(registry, {serializer, deserializer} = {}) {
    if (!registry) {
      throw new Error(`'registry' parameter is missing`);
    }
    this.registry = registry;
    this.serializer = serializer;
    this.deserializer = deserializer;
  }

  async invokeQuery(query) {
    const registry = this.registry.fork();
    if (this.deserializer) {
      query = this.deserializer(query, {registry});
    }
    debug(`→ invokeQuery(%o)`, query);
    let result = await invokeQuery(registry, query);
    debug(`← %o`, result);
    if (this.serializer) {
      result = this.serializer(result);
    }
    return result;
  }
}

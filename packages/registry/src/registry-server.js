import {invokeQuery} from '@deepr/runtime';
import debugModule from 'debug';

const debug = debugModule('registry-server');
// To display the debug log, set this environment:
// DEBUG=registry-server DEBUG_DEPTH=10

export class RegistryServer {
  constructor(registry, {serializer, deserializer} = {}) {
    if (!registry) {
      throw new Error(`'registry' parameter is missing`);
    }
    this.registry = registry;
    this.serializer = serializer;
    this.deserializer = deserializer;
  }

  async invokeQuery(query, {source} = {}) {
    const registry = this.registry.fork();
    if (this.deserializer) {
      query = this.deserializer(query, {source, registry});
    }
    debug(`→ invokeQuery(%o)`, query);
    let result = await invokeQuery(registry, query);
    debug(`← %o`, result);
    if (this.serializer) {
      result = this.serializer(result, {target: source});
    }
    return result;
  }
}

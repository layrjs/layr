import debugModule from 'debug';

const debug = debugModule('registry-client');
// To display the debug log, set this environment:
// DEBUG=registry-client DEBUG_DEPTH=10

export class RegistryClient {
  constructor(remoteRegistry, {serializer, deserializer} = {}) {
    if (!remoteRegistry) {
      throw new Error(`'remoteRegistry' parameter is missing`);
    }
    this.remoteRegistry = remoteRegistry;
    this.serializer = serializer;
    this.deserializer = deserializer;
  }

  async invokeQuery(query, {source} = {}) {
    if (this.serializer) {
      query = this.serializer(query, {target: this.remoteRegistry});
    }
    debug(`→ invokeQuery(%o)`, query);
    let result = await this.remoteRegistry.invokeQuery(query, {source});
    debug(`← %o`, result);
    if (this.deserializer) {
      result = this.deserializer(result, {
        source: this.remoteRegistry,
        registry: this.$registry
      });
    }
    return result;
  }
}

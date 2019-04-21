import debugModule from 'debug';

const debug = debugModule('registry-client');

export class RegistryClient {
  constructor(remoteRegistry, {serializer, deserializer} = {}) {
    if (!remoteRegistry) {
      throw new Error(`'remoteRegistry' parameter is missing`);
    }
    this.remoteRegistry = remoteRegistry;
    this.serializer = serializer;
    this.deserializer = deserializer;
  }

  async invokeQuery(query) {
    if (this.serializer) {
      query = this.serializer(query);
    }
    debug(`→ invokeQuery(%o)`, query);
    let result = await this.remoteRegistry.invokeQuery(query);
    debug(`← %o`, result);
    if (this.deserializer) {
      result = this.deserializer(result, {registry: this.$registry});
    }
    return result;
  }
}

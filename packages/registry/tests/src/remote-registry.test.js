import {Registry} from '../../..';
import {RegistryClient} from '../../..';
import {RegistryServer} from '../../..';

describe('Remote registry', () => {
  test('Basic use', async () => {
    const math = {
      sum: (a, b) => a + b
    };

    const backendRegistry = new Registry({math});
    const registryServer = new RegistryServer(backendRegistry);
    const registryClient = new RegistryClient(registryServer);

    expect(await registryClient.invokeQuery({math: {sum: {'([])': [1, 2]}}})).toEqual({
      math: {sum: 3}
    });
  });
});

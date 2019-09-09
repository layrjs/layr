import {Singleton, field} from '../../..';

describe('Singleton', () => {
  test('Identity', () => {
    class Authenticator extends Singleton {
      @field('string') token;
    }

    const authenticator = new Authenticator({token: 'abc.123.def'});

    expect(authenticator.token).toBe('abc.123.def');

    const otherAuthenticator = Authenticator.deserialize();

    expect(otherAuthenticator.token).toBe('abc.123.def');
  });
});

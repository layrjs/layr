import {Component} from './component';
import {IdentityMap} from './identity-map';
import {primaryIdentifier, secondaryIdentifier} from './decorators';

describe('Identity map', () => {
  test('new IdentityMap()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
    }

    const identityMap = new IdentityMap(User);

    expect(identityMap.getParent()).toBe(User);
  });

  test('getComponent()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
    }

    const identityMap = new IdentityMap(User);

    expect(identityMap.getComponent({id: 'abc123'})).toBeUndefined();

    const user = new User({id: 'abc123'});

    identityMap.addComponent(user);

    expect(identityMap.getComponent({id: 'abc123'})).toBe(user);
    expect(identityMap.getComponent({id: 'xyz456'})).toBeUndefined();
  });

  test('addComponent()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
    }

    const identityMap = new IdentityMap(User);
    const user = new User({id: 'abc123'});

    identityMap.addComponent(user);

    expect(identityMap.getComponent({id: 'abc123'})).toBe(user);

    expect(() => identityMap.addComponent(user)).toThrow(
      "A component with the same identifier already exists (attribute: 'User.prototype.id')"
    );

    user.detach();

    expect(() => identityMap.addComponent(user)).toThrow(
      "Cannot add a detached component to the identity map (component: 'User')"
    );
  });

  test('updateComponent()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
    }

    const identityMap = new IdentityMap(User);

    const user = new User({id: 'abc123', email: 'hi@hello.com'});

    identityMap.addComponent(user);

    expect(identityMap.getComponent({email: 'hi@hello.com'})).toBe(user);

    user.email = 'salut@bonjour.com';

    identityMap.updateComponent(user, 'email', {
      previousValue: 'hi@hello.com',
      newValue: 'salut@bonjour.com'
    });

    expect(identityMap.getComponent({email: 'salut@bonjour.com'})).toBe(user);
    expect(identityMap.getComponent({email: 'hi@hello.com'})).toBe(undefined);

    const otherUser = new User({id: 'xyz456', email: 'hi@hello.com'});

    identityMap.addComponent(otherUser);

    expect(identityMap.getComponent({email: 'hi@hello.com'})).toBe(otherUser);

    expect(() =>
      identityMap.updateComponent(otherUser, 'email', {
        previousValue: 'hi@hello.com',
        newValue: 'salut@bonjour.com'
      })
    ).toThrow(
      "A component with the same identifier already exists (attribute: 'User.prototype.email')"
    );

    // --- Forking ---

    const ForkedUser = User.fork();

    const forkedIdentityMap = identityMap.fork(ForkedUser);

    const forkedUser = forkedIdentityMap.getComponent({email: 'salut@bonjour.com'}) as User;

    expect(forkedUser.isForkOf(user)).toBe(true);

    forkedUser.email = 'hi@hello.com';

    forkedIdentityMap.updateComponent(forkedUser, 'email', {
      previousValue: 'salut@bonjour.com',
      newValue: 'hi@hello.com'
    });

    expect(forkedIdentityMap.getComponent({email: 'hi@hello.com'})).toBe(forkedUser);

    expect(() => forkedIdentityMap.getComponent({email: 'salut@bonjour.com'})).toThrow(
      "A component with the same identifier already exists (attribute: 'User.prototype.id')"
    );
  });

  test('removeComponent()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
    }

    const identityMap = new IdentityMap(User);
    const user = new User({id: 'abc123'});

    identityMap.addComponent(user);

    expect(identityMap.getComponent({id: 'abc123'})).toBe(user);

    identityMap.removeComponent(user);

    expect(identityMap.getComponent({id: 'abc123'})).toBeUndefined();

    identityMap.addComponent(user);

    expect(identityMap.getComponent({id: 'abc123'})).toBe(user);

    user.detach();

    expect(() => identityMap.removeComponent(user)).toThrow(
      "Cannot remove a detached component from the identity map (component: 'User')"
    );
  });
});

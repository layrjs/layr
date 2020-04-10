import {Entity, primaryIdentifier, secondaryIdentifier, EntityManager} from '../../..';

describe('Entity manager', () => {
  test('new EntityManager()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
    }

    const entityManager = new EntityManager(User);

    expect(entityManager.getParent()).toBe(User);
  });

  test('getEntity()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
    }

    const entityManager = new EntityManager(User);

    expect(entityManager.getEntity({id: 'abc123'})).toBeUndefined();

    const user = new User({id: 'abc123'});

    entityManager.addEntity(user);

    expect(entityManager.getEntity({id: 'abc123'})).toBe(user);
    expect(entityManager.getEntity({id: 'xyz456'})).toBeUndefined();
  });

  test('addEntity()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
    }

    const entityManager = new EntityManager(User);
    const user = new User({id: 'abc123'});

    entityManager.addEntity(user);

    expect(entityManager.getEntity({id: 'abc123'})).toBe(user);

    expect(() => entityManager.addEntity(user)).toThrow(
      "An entity with the same identifier already exists (entity name: 'user', attribute name: 'id')"
    );

    user.detach();

    expect(() => entityManager.addEntity(user)).toThrow(
      "Cannot add a detached entity to the entity manager (entity name: 'user')"
    );
  });

  test('updateEntity()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
      @secondaryIdentifier() email;
    }

    const entityManager = new EntityManager(User);

    const user = new User({id: 'abc123', email: 'hi@hello.com'});

    entityManager.addEntity(user);

    expect(entityManager.getEntity({email: 'hi@hello.com'})).toBe(user);

    user.email = 'salut@bonjour.com';

    entityManager.updateEntity(user, 'email', {
      previousValue: 'hi@hello.com',
      newValue: 'salut@bonjour.com'
    });

    expect(entityManager.getEntity({email: 'salut@bonjour.com'})).toBe(user);
    expect(entityManager.getEntity({email: 'hi@hello.com'})).toBe(undefined);

    const otherUser = new User({id: 'xyz456', email: 'hi@hello.com'});

    entityManager.addEntity(otherUser);

    expect(entityManager.getEntity({email: 'hi@hello.com'})).toBe(otherUser);

    expect(() =>
      entityManager.updateEntity(otherUser, 'email', {
        previousValue: 'hi@hello.com',
        newValue: 'salut@bonjour.com'
      })
    ).toThrow(
      "An entity with the same identifier already exists (entity name: 'user', attribute name: 'email')"
    );
  });

  test('removeEntity()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
    }

    const entityManager = new EntityManager(User);
    const user = new User({id: 'abc123'});

    entityManager.addEntity(user);

    expect(entityManager.getEntity({id: 'abc123'})).toBe(user);

    entityManager.removeEntity(user);

    expect(entityManager.getEntity({id: 'abc123'})).toBeUndefined();

    entityManager.addEntity(user);

    expect(entityManager.getEntity({id: 'abc123'})).toBe(user);

    user.detach();

    expect(() => entityManager.removeEntity(user)).toThrow(
      "Cannot remove a detached entity from the entity manager (entity name: 'user')"
    );
  });
});

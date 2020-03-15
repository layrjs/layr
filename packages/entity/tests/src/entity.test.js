import {
  Entity,
  isEntityClass,
  isEntityInstance,
  isIdentifierAttribute,
  primaryIdentifier,
  isPrimaryIdentifierAttribute,
  secondaryIdentifier,
  isSecondaryIdentifierAttribute,
  attribute
} from '../../..';

describe('Entity', () => {
  test('Creation', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
      @secondaryIdentifier() email;
      @secondaryIdentifier() username;
    }

    const user = new User({email: 'hi@hello.com', username: 'hi'});

    expect(isEntityClass(User)).toBe(true);
    expect(user.getPrimaryIdentifierAttribute().isSet()).toBe(true);
    expect(user.id.length >= 25).toBe(true);
    expect(user.getSecondaryIdentifierAttribute('email').isSet()).toBe(true);
    expect(user.email).toBe('hi@hello.com');
    expect(user.getSecondaryIdentifierAttribute('username').isSet()).toBe(true);
    expect(user.username).toBe('hi');

    expect(() => new User()).toThrow(
      "Cannot assign a value of an unexpected type (entity name: 'user', attribute name: 'email', expected type: 'string', received type: 'undefined')"
    );
  });

  test('isEntityClass()', async () => {
    class Movie extends Entity {}

    expect(isEntityClass(Movie)).toBe(true);
    expect(isEntityClass(Movie.prototype)).toBe(false);

    const movie = new Movie();

    expect(isEntityClass(movie)).toBe(false);
  });

  test('isEntityInstance()', async () => {
    class Movie extends Entity {}

    expect(isEntityInstance(Movie)).toBe(false);
    expect(isEntityInstance(Movie.prototype)).toBe(true);

    const movie = new Movie();

    expect(isEntityInstance(movie)).toBe(true);
  });

  test('getIdentifierAttribute()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
      @secondaryIdentifier() email;
      @attribute('string') name;
    }

    let identifierAttribute = User.prototype.getIdentifierAttribute('id');

    expect(isIdentifierAttribute(identifierAttribute)).toBe(true);
    expect(identifierAttribute.getName()).toBe('id');
    expect(identifierAttribute.getParent()).toBe(User.prototype);

    identifierAttribute = User.prototype.getIdentifierAttribute('email');

    expect(isIdentifierAttribute(identifierAttribute)).toBe(true);
    expect(identifierAttribute.getName()).toBe('email');
    expect(identifierAttribute.getParent()).toBe(User.prototype);

    expect(() => User.prototype.getIdentifierAttribute('name')).toThrow(
      "A property with the specified name was found, but it is not an identifier attribute (entity name: 'user', attribute name: 'name')"
    );
  });

  test('getPrimaryIdentifierAttribute()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
    }

    const identifierAttribute = User.prototype.getPrimaryIdentifierAttribute();

    expect(isPrimaryIdentifierAttribute(identifierAttribute)).toBe(true);
    expect(identifierAttribute.getName()).toBe('id');
    expect(identifierAttribute.getParent()).toBe(User.prototype);

    class Movie extends Entity {
      @secondaryIdentifier() slug;
    }

    expect(() => Movie.prototype.getPrimaryIdentifierAttribute()).toThrow(
      "The entity 'movie' doesn't have a primary identifier attribute"
    );
  });

  test('getSecondaryIdentifierAttribute()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
      @secondaryIdentifier() email;
    }

    const identifierAttribute = User.prototype.getSecondaryIdentifierAttribute('email');

    expect(isSecondaryIdentifierAttribute(identifierAttribute)).toBe(true);
    expect(identifierAttribute.getName()).toBe('email');
    expect(identifierAttribute.getParent()).toBe(User.prototype);

    expect(() => User.prototype.getSecondaryIdentifierAttribute('id')).toThrow(
      "A property with the specified name was found, but it is not a secondary identifier attribute (entity name: 'user', attribute name: 'id')"
    );
  });

  test('setPrimaryIdentifierAttribute()', async () => {
    class User extends Entity {}

    expect(User.prototype.hasPrimaryIdentifierAttribute()).toBe(false);

    const setPrimaryIdentifierAttributeResult = User.prototype.setPrimaryIdentifierAttribute('id');

    expect(User.prototype.hasPrimaryIdentifierAttribute()).toBe(true);

    const primaryIdentifierAttribute = User.prototype.getPrimaryIdentifierAttribute();

    expect(primaryIdentifierAttribute).toBe(setPrimaryIdentifierAttributeResult);
    expect(isPrimaryIdentifierAttribute(primaryIdentifierAttribute)).toBe(true);
    expect(primaryIdentifierAttribute.getName()).toBe('id');
    expect(primaryIdentifierAttribute.getParent()).toBe(User.prototype);

    expect(() => User.prototype.setPrimaryIdentifierAttribute('email')).toThrow(
      "The entity 'user' has already a primary identifier attribute"
    );
  });

  test('setSecondaryIdentifierAttribute()', async () => {
    class User extends Entity {}

    expect(User.prototype.hasSecondaryIdentifierAttribute('email')).toBe(false);

    const setSecondaryIdentifierAttributeResult = User.prototype.setSecondaryIdentifierAttribute(
      'email'
    );

    expect(User.prototype.hasSecondaryIdentifierAttribute('email')).toBe(true);

    const secondaryIdentifierAttribute = User.prototype.getSecondaryIdentifierAttribute('email');

    expect(secondaryIdentifierAttribute).toBe(setSecondaryIdentifierAttributeResult);
    expect(isSecondaryIdentifierAttribute(secondaryIdentifierAttribute)).toBe(true);
    expect(secondaryIdentifierAttribute.getName()).toBe('email');
    expect(secondaryIdentifierAttribute.getParent()).toBe(User.prototype);

    expect(() => User.prototype.setSecondaryIdentifierAttribute('username')).not.toThrow();
  });

  test('hasIdentifierAttribute()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
      @secondaryIdentifier() email;
      @attribute('string') name;
    }

    expect(User.prototype.hasIdentifierAttribute('id')).toBe(true);
    expect(User.prototype.hasIdentifierAttribute('email')).toBe(true);
    expect(User.prototype.hasIdentifierAttribute('username')).toBe(false);

    expect(() => User.prototype.hasIdentifierAttribute('name')).toThrow(
      "A property with the specified name was found, but it is not an identifier attribute (entity name: 'user', attribute name: 'name')"
    );
  });

  test('hasPrimaryIdentifierAttribute()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
    }

    expect(User.prototype.hasPrimaryIdentifierAttribute()).toBe(true);

    class Movie extends Entity {
      @secondaryIdentifier() slug;
    }

    expect(Movie.prototype.hasPrimaryIdentifierAttribute()).toBe(false);
  });

  test('hasSecondaryIdentifierAttribute()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
      @secondaryIdentifier() email;
      @attribute('string') name;
    }

    expect(User.prototype.hasSecondaryIdentifierAttribute('email')).toBe(true);
    expect(User.prototype.hasSecondaryIdentifierAttribute('username')).toBe(false);

    expect(() => User.prototype.hasSecondaryIdentifierAttribute('id')).toThrow(
      "A property with the specified name was found, but it is not a secondary identifier attribute (entity name: 'user', attribute name: 'id')"
    );
    expect(() => User.prototype.hasSecondaryIdentifierAttribute('name')).toThrow(
      "A property with the specified name was found, but it is not an identifier attribute (entity name: 'user', attribute name: 'name')"
    );
  });

  test('getIdentifierAttributes()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
      @secondaryIdentifier() email;
      @secondaryIdentifier() username;
      @attribute('string') name;
    }

    const identifierAttributes = User.prototype.getIdentifierAttributes();

    expect(typeof identifierAttributes[Symbol.iterator]).toBe('function');
    expect(Array.from(identifierAttributes).map(property => property.getName())).toEqual([
      'id',
      'email',
      'username'
    ]);
  });

  test('getSecondaryIdentifierAttributes()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
      @secondaryIdentifier() email;
      @secondaryIdentifier() username;
      @attribute('string') name;
    }

    const secondaryIdentifierAttributes = User.prototype.getSecondaryIdentifierAttributes();

    expect(typeof secondaryIdentifierAttributes[Symbol.iterator]).toBe('function');
    expect(Array.from(secondaryIdentifierAttributes).map(property => property.getName())).toEqual([
      'email',
      'username'
    ]);
  });

  test('generateId()', async () => {
    class Movie extends Entity {}

    const id1 = Movie.generateId();

    expect(typeof id1).toBe('string');
    expect(id1.length >= 25);

    const id2 = Movie.generateId();

    expect(typeof id2).toBe('string');
    expect(id2.length >= 25);
    expect(id2).not.toBe(id1);
  });

  test('Entity management', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
      @secondaryIdentifier() email;
    }

    const user1 = User.prototype.deserialize({id: 'abc123'});

    expect(() => new User({id: 'abc123'})).toThrow(
      "An entity with the same identifier already exists (entity name: 'user', attribute name: 'id')"
    );

    expect(() => User.prototype.deserialize({__new: true, id: 'abc123'})).toThrow(
      "Cannot mark as new an existing non-new entity (entity name: 'user')"
    );

    const user2 = User.prototype.deserialize({id: 'abc123'});

    expect(user2).toBe(user1);

    const user3 = User.prototype.deserialize({id: 'xyz789'});

    expect(user3).not.toBe(user1);

    const user4 = User.prototype.deserialize({email: 'hi@hello.com'});

    expect(user4).not.toBe(user1);

    const user5 = User.prototype.deserialize({email: 'hi@hello.com'});

    expect(user5).toBe(user4);

    user4.email = 'salut@bonjour.com';

    const user6 = User.prototype.deserialize({email: 'hi@hello.com'});

    expect(user6).not.toBe(user4);

    expect(() => {
      user4.email = 'hi@hello.com';
    }).toThrow(
      "An entity with the same identifier already exists (entity name: 'user', attribute name: 'email')"
    );
  });
});

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

    expect(isEntityClass(User)).toBe(true);

    const user = new User({email: 'hi@hello.com', username: 'hi'});

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

  test('Instantiation', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
      @secondaryIdentifier() email;
    }

    const user1 = User.instantiate({id: 'abc123'});

    expect(() => new User({id: 'abc123'})).toThrow(
      "An entity with the same identifier already exists (entity name: 'user', attribute name: 'id')"
    );

    expect(() => User.instantiate({id: 'abc123'}, {isNew: true})).toThrow(
      "Cannot mark as new an existing non-new entity (entity name: 'user')"
    );

    const user2 = User.instantiate({id: 'abc123'});

    expect(user2).toBe(user1);

    const user3 = User.instantiate({id: 'def456'});

    expect(user3).not.toBe(user1);

    const user4 = User.instantiate({email: 'hi@hello.com'});

    expect(user4).not.toBe(user1);

    const user5 = User.instantiate({email: 'hi@hello.com'});

    expect(user5).toBe(user4);

    user4.email = 'salut@bonjour.com';

    const user6 = User.instantiate({email: 'hi@hello.com'});

    expect(user6).not.toBe(user4);

    expect(() => {
      user4.email = 'hi@hello.com';
    }).toThrow(
      "An entity with the same identifier already exists (entity name: 'user', attribute name: 'email')"
    );

    const user7 = new User({id: 'xyz789', email: 'salut@bonjour.com'});

    expect(user7.isNew()).toBe(true);

    const user8 = User.instantiate({id: 'xyz789'}, {isNew: false});

    expect(user8).toBe(user7);
    expect(user8.isNew()).toBe(false);

    const user9 = new User({id: 'jjj000', email: 'hey@konichiwa.com'});

    expect(user9.isNew()).toBe(true);

    const user10 = User.instantiate({id: 'jjj000'});

    expect(user10).toBe(user9);
    expect(user10.isNew()).toBe(true);
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

  test('getIdentifierDescriptor()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
      @secondaryIdentifier() email;
      @secondaryIdentifier('number') reference;
      @attribute('string') name;
    }

    expect(
      User.fork()
        .instantiate({id: 'abc123'})
        .getIdentifierDescriptor()
    ).toStrictEqual({
      id: 'abc123'
    });
    expect(
      User.fork()
        .instantiate({id: 'abc123', email: 'hi@hello.com'})
        .getIdentifierDescriptor()
    ).toStrictEqual({
      id: 'abc123'
    });
    expect(
      User.fork()
        .instantiate({email: 'hi@hello.com'})
        .getIdentifierDescriptor()
    ).toStrictEqual({
      email: 'hi@hello.com'
    });
    expect(
      User.fork()
        .instantiate({email: 'hi@hello.com', reference: 123456})
        .getIdentifierDescriptor()
    ).toStrictEqual({
      email: 'hi@hello.com'
    });
    expect(
      User.fork()
        .instantiate({reference: 123456})
        .getIdentifierDescriptor()
    ).toStrictEqual({
      reference: 123456
    });

    expect(() =>
      User.fork()
        .instantiate({name: 'john'})
        .getIdentifierDescriptor()
    ).toThrow(
      "Cannot get an identifier descriptor from an entity that has no set identifier (entity name: 'user')"
    );
  });

  test('normalizeIdentifierDescriptor()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
      @secondaryIdentifier() email;
      @secondaryIdentifier('number') reference;
      @attribute('string') name;
    }

    expect(User.normalizeIdentifierDescriptor('abc123')).toStrictEqual({id: 'abc123'});
    expect(User.normalizeIdentifierDescriptor({id: 'abc123'})).toStrictEqual({id: 'abc123'});
    expect(User.normalizeIdentifierDescriptor({email: 'hi@hello.com'})).toStrictEqual({
      email: 'hi@hello.com'
    });
    expect(User.normalizeIdentifierDescriptor({reference: 123456})).toStrictEqual({
      reference: 123456
    });

    expect(() => User.normalizeIdentifierDescriptor(undefined)).toThrow(
      "An identifier descriptor should be a string, a number, or an object, but received a value of type 'undefined' (entity name: 'user')"
    );
    expect(() => User.normalizeIdentifierDescriptor(true)).toThrow(
      "An identifier descriptor should be a string, a number, or an object, but received a value of type 'boolean' (entity name: 'user')"
    );
    expect(() => User.normalizeIdentifierDescriptor([])).toThrow(
      "An identifier descriptor should be a string, a number, or an object, but received a value of type 'array' (entity name: 'user')"
    );
    expect(() => User.normalizeIdentifierDescriptor({})).toThrow(
      "An identifier descriptor should be a string, a number, or an object composed of one attribute, but received an object composed of 0 attributes (entity name: 'user', received object: {})"
    );
    expect(() => User.normalizeIdentifierDescriptor({id: 'abc123', email: 'hi@hello.com'})).toThrow(
      'An identifier descriptor should be a string, a number, or an object composed of one attribute, but received an object composed of 2 attributes (entity name: \'user\', received object: {"id":"abc123","email":"hi@hello.com"})'
    );
    expect(() => User.normalizeIdentifierDescriptor(123456)).toThrow(
      "Cannot assign a value of an unexpected type (entity name: 'user', attribute name: 'id', expected type: 'string', received type: 'number')"
    );
    expect(() => User.normalizeIdentifierDescriptor({email: 123456})).toThrow(
      "Cannot assign a value of an unexpected type (entity name: 'user', attribute name: 'email', expected type: 'string', received type: 'number')"
    );
    expect(() => User.normalizeIdentifierDescriptor({reference: 'abc123'})).toThrow(
      "Cannot assign a value of an unexpected type (entity name: 'user', attribute name: 'reference', expected type: 'number', received type: 'string')"
    );
    expect(() => User.normalizeIdentifierDescriptor({email: undefined})).toThrow(
      "Cannot assign a value of an unexpected type (entity name: 'user', attribute name: 'email', expected type: 'string', received type: 'undefined')"
    );
    expect(() => User.normalizeIdentifierDescriptor({name: 'john'})).toThrow(
      "A property with the specified name was found, but it is not an identifier attribute (entity name: 'user', attribute name: 'name')"
    );
    expect(() => User.normalizeIdentifierDescriptor({country: 'USA'})).toThrow(
      "The property 'country' is missing (entity name: 'user')"
    );
  });

  test('describeIdentifierDescriptor()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
      @secondaryIdentifier() email;
      @secondaryIdentifier('number') reference;
    }

    expect(User.describeIdentifierDescriptor('abc123')).toBe("id: 'abc123'");
    expect(User.describeIdentifierDescriptor({id: 'abc123'})).toBe("id: 'abc123'");
    expect(User.describeIdentifierDescriptor({email: 'hi@hello.com'})).toBe(
      "email: 'hi@hello.com'"
    );
    expect(User.describeIdentifierDescriptor({reference: 123456})).toBe('reference: 123456');
  });

  test('expandAttributeSelector()', async () => {
    class Movie extends Entity {
      @primaryIdentifier() id;
      @attribute('string') title = '';
      @attribute('person?') director;
    }

    class Person extends Entity {
      @primaryIdentifier() id;
      @attribute('string') name = '';
    }

    Movie.registerRelatedComponent(Person);

    expect(Movie.prototype.expandAttributeSelector(true)).toStrictEqual({
      id: true,
      title: true,
      director: {id: true, name: true}
    });

    expect(Movie.prototype.expandAttributeSelector(false)).toStrictEqual({id: true});

    expect(Movie.prototype.expandAttributeSelector({})).toStrictEqual({id: true});

    expect(Movie.prototype.expandAttributeSelector({title: true})).toStrictEqual({
      id: true,
      title: true
    });

    expect(Movie.prototype.expandAttributeSelector({director: true})).toStrictEqual({
      id: true,
      director: {id: true, name: true}
    });

    expect(Movie.prototype.expandAttributeSelector({director: false})).toStrictEqual({
      id: true
    });

    expect(Movie.prototype.expandAttributeSelector({director: {}})).toStrictEqual({
      id: true,
      director: {id: true}
    });
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

  test('fork()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
      @secondaryIdentifier() email;
    }

    const user = User.instantiate({id: 'abc123', email: 'hi@hello.com'});

    expect(user.id).toBe('abc123');
    expect(user.email).toBe('hi@hello.com');

    let ForkedUser = User.fork();

    const forkedUser = ForkedUser.instantiate({id: 'abc123'});

    expect(forkedUser.constructor).toBe(ForkedUser);
    expect(forkedUser).toBeInstanceOf(ForkedUser);

    expect(forkedUser.isForkOf(user)).toBe(true);
    expect(forkedUser).not.toBe(user);
    expect(forkedUser.id).toBe('abc123');
    expect(forkedUser.email).toBe('hi@hello.com');

    // --- With a nested entity ---

    class Article extends Entity {
      @primaryIdentifier() id;
      @attribute('string') title;
      @attribute('user') author;
    }

    Article.registerRelatedComponent(User);

    const article = Article.instantiate({id: 'xyz456', title: 'Hello', author: user});

    expect(article.id).toBe('xyz456');
    expect(article.title).toBe('Hello');

    const author = article.author;

    expect(author).toBe(user);

    const ForkedArticle = Article.fork();

    const forkedArticle = ForkedArticle.instantiate({id: 'xyz456'});

    expect(forkedArticle.constructor).toBe(ForkedArticle);
    expect(forkedArticle).toBeInstanceOf(ForkedArticle);

    expect(forkedArticle.isForkOf(article)).toBe(true);
    expect(forkedArticle).not.toBe(article);
    expect(forkedArticle.id).toBe('xyz456');
    expect(forkedArticle.title).toBe('Hello');

    const forkedAuthor = forkedArticle.author;

    ForkedUser = ForkedArticle.getRelatedComponent('User');

    expect(forkedAuthor.constructor).toBe(ForkedUser);
    expect(forkedAuthor).toBeInstanceOf(ForkedUser);

    expect(forkedAuthor.isForkOf(author)).toBe(true);
    expect(forkedAuthor).not.toBe(author);
    expect(forkedAuthor.id).toBe('abc123');
    expect(forkedAuthor.email).toBe('hi@hello.com');
  });

  test('detach()', async () => {
    class User extends Entity {
      @primaryIdentifier() id;
    }

    const user = User.instantiate({id: 'abc123'});
    const sameUser = User.instantiate({id: 'abc123'});

    expect(sameUser).toBe(user);

    user.detach();

    const otherUser = User.instantiate({id: 'abc123'});
    const sameOtherUser = User.instantiate({id: 'abc123'});

    expect(otherUser).not.toBe(user);
    expect(sameOtherUser).toBe(otherUser);

    User.detach();

    const user2 = User.instantiate({id: 'xyz456'});
    const otherUser2 = User.instantiate({id: 'xyz456'});

    expect(otherUser2).not.toBe(user2);
  });
});

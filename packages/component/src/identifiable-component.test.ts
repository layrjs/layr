import {Component} from './component';
import {
  isIdentifierAttributeInstance,
  isPrimaryIdentifierAttributeInstance,
  isSecondaryIdentifierAttributeInstance
} from './properties';
import {attribute, primaryIdentifier, secondaryIdentifier, provide} from './decorators';

describe('Identifiable component', () => {
  test('Creation', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
      @secondaryIdentifier() username!: string;
    }

    const user = new User({email: 'hi@hello.com', username: 'hi'});

    expect(user.getPrimaryIdentifierAttribute().isSet()).toBe(true);
    expect(user.id.length >= 25).toBe(true);
    expect(user.getSecondaryIdentifierAttribute('email').isSet()).toBe(true);
    expect(user.email).toBe('hi@hello.com');
    expect(user.getSecondaryIdentifierAttribute('username').isSet()).toBe(true);
    expect(user.username).toBe('hi');

    expect(() => new User()).toThrow(
      "Cannot assign a value of an unexpected type (component: 'User', attribute: 'email', expected type: 'string', received type: 'undefined')"
    );
  });

  test('Instantiation', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
    }

    const user1 = User.instantiate({id: 'abc123'});

    expect(() => new User({id: 'abc123'})).toThrow(
      "A component with the same identifier already exists (component: 'User', attribute: 'id')"
    );

    expect(() => User.instantiate({id: 'abc123'}, {isNew: true})).toThrow(
      "Cannot mark as new an existing non-new component (component: 'User')"
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
      "A component with the same identifier already exists (component: 'User', attribute: 'email')"
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

  test('getIdentifierAttribute()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
      @attribute('string') name = '';
    }

    let identifierAttribute = User.prototype.getIdentifierAttribute('id');

    expect(isIdentifierAttributeInstance(identifierAttribute)).toBe(true);
    expect(identifierAttribute.getName()).toBe('id');
    expect(identifierAttribute.getParent()).toBe(User.prototype);

    identifierAttribute = User.prototype.getIdentifierAttribute('email');

    expect(isIdentifierAttributeInstance(identifierAttribute)).toBe(true);
    expect(identifierAttribute.getName()).toBe('email');
    expect(identifierAttribute.getParent()).toBe(User.prototype);

    expect(() => User.prototype.getIdentifierAttribute('name')).toThrow(
      "A property with the specified name was found, but it is not an identifier attribute (component: 'User', attribute: 'name')"
    );
  });

  test('hasIdentifierAttribute()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
      @attribute('string') name = '';
    }

    expect(User.prototype.hasIdentifierAttribute('id')).toBe(true);
    expect(User.prototype.hasIdentifierAttribute('email')).toBe(true);
    expect(User.prototype.hasIdentifierAttribute('username')).toBe(false);

    expect(() => User.prototype.hasIdentifierAttribute('name')).toThrow(
      "A property with the specified name was found, but it is not an identifier attribute (component: 'User', attribute: 'name')"
    );
  });

  test('getPrimaryIdentifierAttribute()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
    }

    const identifierAttribute = User.prototype.getPrimaryIdentifierAttribute();

    expect(isPrimaryIdentifierAttributeInstance(identifierAttribute)).toBe(true);
    expect(identifierAttribute.getName()).toBe('id');
    expect(identifierAttribute.getParent()).toBe(User.prototype);

    class Movie extends Component {
      @secondaryIdentifier() slug!: string;
    }

    expect(() => Movie.prototype.getPrimaryIdentifierAttribute()).toThrow(
      "The component 'Movie' doesn't have a primary identifier attribute"
    );
  });

  test('hasPrimaryIdentifierAttribute()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
    }

    expect(User.prototype.hasPrimaryIdentifierAttribute()).toBe(true);

    class Movie extends Component {
      @secondaryIdentifier() slug!: string;
    }

    expect(Movie.prototype.hasPrimaryIdentifierAttribute()).toBe(false);
  });

  test('setPrimaryIdentifierAttribute()', async () => {
    class User extends Component {}

    expect(User.prototype.hasPrimaryIdentifierAttribute()).toBe(false);

    const setPrimaryIdentifierAttributeResult = User.prototype.setPrimaryIdentifierAttribute('id');

    expect(User.prototype.hasPrimaryIdentifierAttribute()).toBe(true);

    const primaryIdentifierAttribute = User.prototype.getPrimaryIdentifierAttribute();

    expect(primaryIdentifierAttribute).toBe(setPrimaryIdentifierAttributeResult);
    expect(isPrimaryIdentifierAttributeInstance(primaryIdentifierAttribute)).toBe(true);
    expect(primaryIdentifierAttribute.getName()).toBe('id');
    expect(primaryIdentifierAttribute.getParent()).toBe(User.prototype);

    expect(() => User.prototype.setPrimaryIdentifierAttribute('email')).toThrow(
      "The component 'User' already has a primary identifier attribute"
    );
  });

  test('getSecondaryIdentifierAttribute()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
    }

    const identifierAttribute = User.prototype.getSecondaryIdentifierAttribute('email');

    expect(isSecondaryIdentifierAttributeInstance(identifierAttribute)).toBe(true);
    expect(identifierAttribute.getName()).toBe('email');
    expect(identifierAttribute.getParent()).toBe(User.prototype);

    expect(() => User.prototype.getSecondaryIdentifierAttribute('id')).toThrow(
      "A property with the specified name was found, but it is not a secondary identifier attribute (component: 'User', attribute: 'id')"
    );
  });

  test('hasSecondaryIdentifierAttribute()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
      @attribute('string') name = '';
    }

    expect(User.prototype.hasSecondaryIdentifierAttribute('email')).toBe(true);
    expect(User.prototype.hasSecondaryIdentifierAttribute('username')).toBe(false);

    expect(() => User.prototype.hasSecondaryIdentifierAttribute('id')).toThrow(
      "A property with the specified name was found, but it is not a secondary identifier attribute (component: 'User', attribute: 'id')"
    );
    expect(() => User.prototype.hasSecondaryIdentifierAttribute('name')).toThrow(
      "A property with the specified name was found, but it is not a secondary identifier attribute (component: 'User', attribute: 'name')"
    );
  });

  test('setSecondaryIdentifierAttribute()', async () => {
    class User extends Component {}

    expect(User.prototype.hasSecondaryIdentifierAttribute('email')).toBe(false);

    const setSecondaryIdentifierAttributeResult = User.prototype.setSecondaryIdentifierAttribute(
      'email'
    );

    expect(User.prototype.hasSecondaryIdentifierAttribute('email')).toBe(true);

    const secondaryIdentifierAttribute = User.prototype.getSecondaryIdentifierAttribute('email');

    expect(secondaryIdentifierAttribute).toBe(setSecondaryIdentifierAttributeResult);
    expect(isSecondaryIdentifierAttributeInstance(secondaryIdentifierAttribute)).toBe(true);
    expect(secondaryIdentifierAttribute.getName()).toBe('email');
    expect(secondaryIdentifierAttribute.getParent()).toBe(User.prototype);

    expect(() => User.prototype.setSecondaryIdentifierAttribute('username')).not.toThrow();
  });

  test('getIdentifierAttributes()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
      @secondaryIdentifier() username!: string;
      @attribute('string') name = '';
    }

    const identifierAttributes = User.prototype.getIdentifierAttributes();

    expect(typeof identifierAttributes[Symbol.iterator]).toBe('function');
    expect(Array.from(identifierAttributes).map((property) => property.getName())).toEqual([
      'id',
      'email',
      'username'
    ]);
  });

  test('getSecondaryIdentifierAttributes()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
      @secondaryIdentifier() username!: string;
      @attribute('string') name = '';
    }

    const secondaryIdentifierAttributes = User.prototype.getSecondaryIdentifierAttributes();

    expect(typeof secondaryIdentifierAttributes[Symbol.iterator]).toBe('function');
    expect(
      Array.from(secondaryIdentifierAttributes).map((property) => property.getName())
    ).toEqual(['email', 'username']);
  });

  test('getIdentifiers()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
      @secondaryIdentifier('number') reference!: number;
      @attribute('string') name = '';
    }

    expect(User.fork().instantiate({id: 'abc123'}).getIdentifiers()).toStrictEqual({
      id: 'abc123'
    });
    expect(
      User.fork().instantiate({id: 'abc123', email: 'hi@hello.com'}).getIdentifiers()
    ).toStrictEqual({
      id: 'abc123',
      email: 'hi@hello.com'
    });
    expect(User.fork().instantiate({email: 'hi@hello.com'}).getIdentifiers()).toStrictEqual({
      email: 'hi@hello.com'
    });
    expect(
      User.fork().instantiate({email: 'hi@hello.com', reference: 123456}).getIdentifiers()
    ).toStrictEqual({
      email: 'hi@hello.com',
      reference: 123456
    });
    expect(User.fork().instantiate({reference: 123456}).getIdentifiers()).toStrictEqual({
      reference: 123456
    });

    expect(User.fork().instantiate({name: 'john'}).hasIdentifiers()).toBe(false);
    expect(() => User.fork().instantiate({name: 'john'}).getIdentifiers()).toThrow(
      "Cannot get the identifiers of a component that has no set identifier (component: 'User')"
    );
  });

  test('getIdentifierDescriptor()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
      @secondaryIdentifier('number') reference!: number;
      @attribute('string') name = '';
    }

    expect(User.fork().instantiate({id: 'abc123'}).getIdentifierDescriptor()).toStrictEqual({
      id: 'abc123'
    });
    expect(
      User.fork().instantiate({id: 'abc123', email: 'hi@hello.com'}).getIdentifierDescriptor()
    ).toStrictEqual({
      id: 'abc123'
    });
    expect(
      User.fork().instantiate({email: 'hi@hello.com'}).getIdentifierDescriptor()
    ).toStrictEqual({
      email: 'hi@hello.com'
    });
    expect(
      User.fork().instantiate({email: 'hi@hello.com', reference: 123456}).getIdentifierDescriptor()
    ).toStrictEqual({
      email: 'hi@hello.com'
    });
    expect(User.fork().instantiate({reference: 123456}).getIdentifierDescriptor()).toStrictEqual({
      reference: 123456
    });

    expect(User.fork().instantiate({name: 'john'}).hasIdentifierDescriptor()).toBe(false);
    expect(() => User.fork().instantiate({name: 'john'}).getIdentifierDescriptor()).toThrow(
      "Cannot get an identifier descriptor from a component that has no set identifier (component: 'User')"
    );
  });

  test('normalizeIdentifierDescriptor()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
      @secondaryIdentifier('number') reference!: number;
      @attribute('string') name = '';
    }

    expect(User.normalizeIdentifierDescriptor('abc123')).toStrictEqual({id: 'abc123'});
    expect(User.normalizeIdentifierDescriptor({id: 'abc123'})).toStrictEqual({id: 'abc123'});
    expect(User.normalizeIdentifierDescriptor({email: 'hi@hello.com'})).toStrictEqual({
      email: 'hi@hello.com'
    });
    expect(User.normalizeIdentifierDescriptor({reference: 123456})).toStrictEqual({
      reference: 123456
    });

    // @ts-ignore
    expect(() => User.normalizeIdentifierDescriptor(undefined)).toThrow(
      "An identifier descriptor should be a string, a number, or an object, but received a value of type 'undefined' (component: 'User')"
    );
    // @ts-ignore
    expect(() => User.normalizeIdentifierDescriptor(true)).toThrow(
      "An identifier descriptor should be a string, a number, or an object, but received a value of type 'boolean' (component: 'User')"
    );
    // @ts-ignore
    expect(() => User.normalizeIdentifierDescriptor([])).toThrow(
      "An identifier descriptor should be a string, a number, or an object, but received a value of type 'Array' (component: 'User')"
    );
    expect(() => User.normalizeIdentifierDescriptor({})).toThrow(
      "An identifier descriptor should be a string, a number, or an object composed of one attribute, but received an object composed of 0 attributes (component: 'User', received object: {})"
    );
    expect(() => User.normalizeIdentifierDescriptor({id: 'abc123', email: 'hi@hello.com'})).toThrow(
      'An identifier descriptor should be a string, a number, or an object composed of one attribute, but received an object composed of 2 attributes (component: \'User\', received object: {"id":"abc123","email":"hi@hello.com"})'
    );
    expect(() => User.normalizeIdentifierDescriptor(123456)).toThrow(
      "Cannot assign a value of an unexpected type (component: 'User', attribute: 'id', expected type: 'string', received type: 'number')"
    );
    expect(() => User.normalizeIdentifierDescriptor({email: 123456})).toThrow(
      "Cannot assign a value of an unexpected type (component: 'User', attribute: 'email', expected type: 'string', received type: 'number')"
    );
    expect(() => User.normalizeIdentifierDescriptor({reference: 'abc123'})).toThrow(
      "Cannot assign a value of an unexpected type (component: 'User', attribute: 'reference', expected type: 'number', received type: 'string')"
    );
    // @ts-ignore
    expect(() => User.normalizeIdentifierDescriptor({email: undefined})).toThrow(
      "Cannot assign a value of an unexpected type (component: 'User', attribute: 'email', expected type: 'string', received type: 'undefined')"
    );
    expect(() => User.normalizeIdentifierDescriptor({name: 'john'})).toThrow(
      "A property with the specified name was found, but it is not an identifier attribute (component: 'User', attribute: 'name')"
    );
    expect(() => User.normalizeIdentifierDescriptor({country: 'USA'})).toThrow(
      "The identifier attribute 'country' is missing (component: 'User')"
    );
  });

  test('describeIdentifierDescriptor()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
      @secondaryIdentifier('number') reference!: number;
    }

    expect(User.describeIdentifierDescriptor('abc123')).toBe("id: 'abc123'");
    expect(User.describeIdentifierDescriptor({id: 'abc123'})).toBe("id: 'abc123'");
    expect(User.describeIdentifierDescriptor({email: 'hi@hello.com'})).toBe(
      "email: 'hi@hello.com'"
    );
    expect(User.describeIdentifierDescriptor({reference: 123456})).toBe('reference: 123456');
  });

  test('expandAttributeSelector()', async () => {
    class Person extends Component {
      @primaryIdentifier() id!: string;
      @attribute('string') name = '';
    }

    class Movie extends Component {
      @provide() static Person = Person;

      @primaryIdentifier() id!: string;
      @attribute('string') title = '';
      @attribute('Person?') director?: Person;
    }

    expect(Movie.prototype.expandAttributeSelector(true)).toStrictEqual({
      id: true,
      title: true,
      director: {id: true}
    });

    expect(
      Movie.prototype.expandAttributeSelector(true, {includeReferencedComponents: true})
    ).toStrictEqual({
      id: true,
      title: true,
      director: {id: true, name: true}
    });

    expect(Movie.prototype.expandAttributeSelector(false)).toStrictEqual({});

    expect(Movie.prototype.expandAttributeSelector({})).toStrictEqual({id: true});

    expect(Movie.prototype.expandAttributeSelector({title: true})).toStrictEqual({
      id: true,
      title: true
    });

    expect(Movie.prototype.expandAttributeSelector({director: true})).toStrictEqual({
      id: true,
      director: {id: true}
    });

    expect(
      Movie.prototype.expandAttributeSelector({director: true}, {includeReferencedComponents: true})
    ).toStrictEqual({
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

    expect(
      Movie.prototype.expandAttributeSelector({director: {}}, {includeReferencedComponents: true})
    ).toStrictEqual({
      id: true,
      director: {id: true}
    });
  });

  test('generateId()', async () => {
    class Movie extends Component {}

    const id1 = Movie.generateId();

    expect(typeof id1).toBe('string');
    expect(id1.length >= 25).toBe(true);

    const id2 = Movie.generateId();

    expect(typeof id2).toBe('string');
    expect(id2.length >= 25).toBe(true);
    expect(id2).not.toBe(id1);
  });

  test('fork()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
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

    class Article extends Component {
      @provide() static User = User;

      @primaryIdentifier() id!: string;
      @attribute('string') title = '';
      @attribute('User') author!: User;
    }

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

    ForkedUser = ForkedArticle.User;

    expect(forkedAuthor.constructor).toBe(ForkedUser);
    expect(forkedAuthor).toBeInstanceOf(ForkedUser);

    expect(forkedAuthor.isForkOf(author)).toBe(true);
    expect(forkedAuthor).not.toBe(author);
    expect(forkedAuthor.id).toBe('abc123');
    expect(forkedAuthor.email).toBe('hi@hello.com');
  });

  test('getGhost()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
    }

    class App extends Component {
      @provide() static User = User;
    }

    const user = new User();
    const ghostUser = user.getGhost();

    expect(ghostUser.isForkOf(user)).toBe(true);
    expect(ghostUser.constructor).toBe(App.getGhost().User);

    const sameGhostUser = user.getGhost();

    expect(sameGhostUser).toBe(ghostUser);
  });

  test('detach()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
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

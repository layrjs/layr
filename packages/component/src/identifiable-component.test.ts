import {Component} from './component';
import {
  isIdentifierAttributeInstance,
  isPrimaryIdentifierAttributeInstance,
  isSecondaryIdentifierAttributeInstance
} from './properties';
import {attribute, primaryIdentifier, secondaryIdentifier, provide} from './decorators';
import {deserialize} from './deserialization';

describe('Identifiable component', () => {
  test('new ()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
      @secondaryIdentifier() username!: string;
    }

    const user = new User({email: 'hi@hello.com', username: 'hi'});

    expect(user.id.length >= 25).toBe(true);
    expect(user.email).toBe('hi@hello.com');
    expect(user.username).toBe('hi');

    expect(() => new User({id: user.id, email: 'user1@email.com', username: 'user1'})).toThrow(
      "A component with the same identifier already exists (attribute: 'User.prototype.id')"
    );

    expect(() => new User({email: 'hi@hello.com', username: 'user2'})).toThrow(
      "A component with the same identifier already exists (attribute: 'User.prototype.email')"
    );

    expect(() => new User({email: 'user3@email.com', username: 'hi'})).toThrow(
      "A component with the same identifier already exists (attribute: 'User.prototype.username')"
    );

    expect(() => new User()).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'User.prototype.email', expected type: 'string', received type: 'undefined')"
    );
  });

  test('instantiate()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
      @attribute('string') name = '';
    }

    let user = User.instantiate({id: 'abc123'});

    expect(user.id).toBe('abc123');
    expect(user.getAttribute('email').isSet()).toBe(false);
    expect(user.getAttribute('name').isSet()).toBe(false);

    let sameUser = User.instantiate({id: 'abc123'});

    expect(sameUser).toBe(user);

    sameUser = User.instantiate('abc123');

    expect(sameUser).toBe(user);

    user = User.instantiate({email: 'hi@hello.com'});

    expect(user.email).toBe('hi@hello.com');
    expect(user.getAttribute('id').isSet()).toBe(false);
    expect(user.getAttribute('name').isSet()).toBe(false);

    sameUser = User.instantiate({email: 'hi@hello.com'});

    expect(sameUser).toBe(user);

    expect(() => User.instantiate()).toThrow(
      "An identifier is required to instantiate an identifiable component, but received a value of type 'undefined' (component: 'User')"
    );

    expect(() => User.instantiate({})).toThrow(
      "An identifier selector should be a string, a number, or a non-empty object, but received an empty object (component: 'User')"
    );

    expect(() => User.instantiate({name: 'john'})).toThrow(
      "A property with the specified name was found, but it is not an identifier attribute (attribute: 'User.prototype.name')"
    );
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
      "A property with the specified name was found, but it is not an identifier attribute (attribute: 'User.prototype.name')"
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
      "A property with the specified name was found, but it is not an identifier attribute (attribute: 'User.prototype.name')"
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
      "A property with the specified name was found, but it is not a secondary identifier attribute (attribute: 'User.prototype.id')"
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
      "A property with the specified name was found, but it is not a secondary identifier attribute (attribute: 'User.prototype.id')"
    );
    expect(() => User.prototype.hasSecondaryIdentifierAttribute('name')).toThrow(
      "A property with the specified name was found, but it is not a secondary identifier attribute (attribute: 'User.prototype.name')"
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
    }

    let user = User.fork().instantiate({id: 'abc123'});

    expect(user.getIdentifiers()).toStrictEqual({id: 'abc123'});

    user.email = 'hi@hello.com';

    expect(user.getIdentifiers()).toStrictEqual({id: 'abc123', email: 'hi@hello.com'});

    user = User.fork().instantiate({email: 'hi@hello.com'});

    expect(user.getIdentifiers()).toStrictEqual({email: 'hi@hello.com'});
  });

  test('getIdentifierDescriptor()', async () => {
    class User extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() email!: string;
    }

    let user = User.fork().instantiate({id: 'abc123'});

    expect(user.getIdentifierDescriptor()).toStrictEqual({id: 'abc123'});

    user.email = 'hi@hello.com';

    expect(user.getIdentifierDescriptor()).toStrictEqual({id: 'abc123'});

    user = User.fork().instantiate({email: 'hi@hello.com'});

    expect(user.getIdentifierDescriptor()).toStrictEqual({email: 'hi@hello.com'});

    user.id = 'abc123';

    expect(user.getIdentifierDescriptor()).toStrictEqual({id: 'abc123'});
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

    // @ts-expect-error
    expect(() => User.normalizeIdentifierDescriptor(undefined)).toThrow(
      "An identifier descriptor should be a string, a number, or an object, but received a value of type 'undefined' (component: 'User')"
    );
    // @ts-expect-error
    expect(() => User.normalizeIdentifierDescriptor(true)).toThrow(
      "An identifier descriptor should be a string, a number, or an object, but received a value of type 'boolean' (component: 'User')"
    );
    // @ts-expect-error
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
      "Cannot assign a value of an unexpected type (attribute: 'User.prototype.id', expected type: 'string', received type: 'number')"
    );
    expect(() => User.normalizeIdentifierDescriptor({email: 123456})).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'User.prototype.email', expected type: 'string', received type: 'number')"
    );
    expect(() => User.normalizeIdentifierDescriptor({reference: 'abc123'})).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'User.prototype.reference', expected type: 'number', received type: 'string')"
    );
    // @ts-expect-error
    expect(() => User.normalizeIdentifierDescriptor({email: undefined})).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'User.prototype.email', expected type: 'string', received type: 'undefined')"
    );
    expect(() => User.normalizeIdentifierDescriptor({name: 'john'})).toThrow(
      "A property with the specified name was found, but it is not an identifier attribute (attribute: 'User.prototype.name')"
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

  test('resolveAttributeSelector()', async () => {
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

    expect(Movie.prototype.resolveAttributeSelector(true)).toStrictEqual({
      id: true,
      title: true,
      director: {id: true}
    });

    expect(
      Movie.prototype.resolveAttributeSelector(true, {includeReferencedComponents: true})
    ).toStrictEqual({
      id: true,
      title: true,
      director: {id: true, name: true}
    });

    expect(Movie.prototype.resolveAttributeSelector(false)).toStrictEqual({});

    expect(Movie.prototype.resolveAttributeSelector({})).toStrictEqual({id: true});

    expect(Movie.prototype.resolveAttributeSelector({title: true})).toStrictEqual({
      id: true,
      title: true
    });

    expect(Movie.prototype.resolveAttributeSelector({director: true})).toStrictEqual({
      id: true,
      director: {id: true}
    });

    expect(
      Movie.prototype.resolveAttributeSelector(
        {director: true},
        {includeReferencedComponents: true}
      )
    ).toStrictEqual({
      id: true,
      director: {id: true, name: true}
    });

    expect(Movie.prototype.resolveAttributeSelector({director: false})).toStrictEqual({
      id: true
    });

    expect(Movie.prototype.resolveAttributeSelector({director: {}})).toStrictEqual({
      id: true,
      director: {id: true}
    });

    expect(
      Movie.prototype.resolveAttributeSelector({director: {}}, {includeReferencedComponents: true})
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

    const user = new User({id: 'abc123', email: 'hi@hello.com'});

    expect(user.id).toBe('abc123');
    expect(user.email).toBe('hi@hello.com');

    let UserFork = User.fork();

    const userFork = UserFork.getIdentityMap().getComponent({id: 'abc123'}) as User;

    expect(userFork.constructor).toBe(UserFork);
    expect(userFork).toBeInstanceOf(UserFork);

    expect(userFork.isForkOf(user)).toBe(true);
    expect(userFork).not.toBe(user);
    expect(userFork.id).toBe('abc123');
    expect(userFork.email).toBe('hi@hello.com');

    // --- With a referenced identifiable component ---

    class Article extends Component {
      @provide() static User = User;

      @primaryIdentifier() id!: string;
      @attribute('string') title = '';
      @attribute('User') author!: User;
    }

    const article = new Article({id: 'xyz456', title: 'Hello', author: user});

    expect(article.id).toBe('xyz456');
    expect(article.title).toBe('Hello');

    const author = article.author;

    expect(author).toBe(user);

    const ArticleFork = Article.fork();

    const articleFork = ArticleFork.getIdentityMap().getComponent({id: 'xyz456'}) as Article;

    expect(articleFork.constructor).toBe(ArticleFork);
    expect(articleFork).toBeInstanceOf(ArticleFork);

    expect(articleFork.isForkOf(article)).toBe(true);
    expect(articleFork).not.toBe(article);
    expect(articleFork.id).toBe('xyz456');
    expect(articleFork.title).toBe('Hello');

    const authorFork = articleFork.author;

    UserFork = ArticleFork.User;

    expect(authorFork.constructor).toBe(UserFork);
    expect(authorFork).toBeInstanceOf(UserFork);

    expect(authorFork.isForkOf(author)).toBe(true);
    expect(authorFork).not.toBe(author);
    expect(authorFork.id).toBe('abc123');
    expect(authorFork.email).toBe('hi@hello.com');

    expect(UserFork.getIdentityMap().getComponent({id: 'abc123'})).toBe(authorFork);

    // --- With a serialized referenced identifiable component ---

    const deserializedArticle = deserialize(
      {
        __component: 'Article',
        id: 'xyz789',
        title: 'Hello 2',
        author: {__component: 'User', id: 'abc123'}
      },
      {rootComponent: ArticleFork}
    ) as Article;

    const deserializedAuthor = deserializedArticle.author;

    expect(deserializedAuthor.constructor).toBe(UserFork);
    expect(deserializedAuthor).toBeInstanceOf(UserFork);

    expect(deserializedAuthor.isForkOf(author)).toBe(true);
    expect(deserializedAuthor).not.toBe(author);
    expect(deserializedAuthor.id).toBe('abc123');
    expect(deserializedAuthor.email).toBe('hi@hello.com');

    expect(deserializedAuthor).toBe(authorFork);
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
    const sameUser = User.getIdentityMap().getComponent({id: 'abc123'});

    expect(sameUser).toBe(user);

    user.detach();

    const otherUser = User.instantiate({id: 'abc123'});
    const sameOtherUser = User.getIdentityMap().getComponent({id: 'abc123'});

    expect(otherUser).not.toBe(user);
    expect(sameOtherUser).toBe(otherUser);

    User.detach();

    const user2 = User.instantiate({id: 'xyz456'});
    const otherUser2 = User.instantiate({id: 'xyz456'});

    expect(otherUser2).not.toBe(user2);
  });

  test('toObject()', async () => {
    class Director extends Component {
      @primaryIdentifier() id!: string;
      @attribute() name = '';
    }

    class Movie extends Component {
      @provide() static Director = Director;

      @primaryIdentifier() id!: string;
      @attribute() title = '';
      @attribute('Director') director!: Director;
    }

    let movie = new Movie({
      id: 'm1',
      title: 'Inception',
      director: new Director({id: 'd1', name: 'Christopher Nolan'})
    });

    expect(movie.toObject()).toStrictEqual({id: 'm1', title: 'Inception', director: {id: 'd1'}});
    expect(movie.toObject({minimize: true})).toStrictEqual({id: 'm1'});
  });
});

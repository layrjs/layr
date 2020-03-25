import {
  Component,
  expose,
  Model,
  attribute,
  Entity,
  primaryIdentifier,
  secondaryIdentifier,
  validators,
  createComponentMap,
  getComponentFromComponentMap
} from '@liaison/entity';

import {ComponentServer} from '../../..';

describe('ComponentServer', () => {
  test('Introspecting components', async () => {
    class Movie extends Component {
      @expose({call: true}) static find() {}
      @attribute() static limit;

      @expose({get: true, set: true}) title = '';
      @attribute() rating;
    }

    class Cinema extends Component {
      @expose({get: true}) @attribute() movies;
    }

    Cinema.registerRelatedComponent(Movie);

    const componentMap = createComponentMap([Movie, Cinema]);

    const componentProvider = {
      getComponent(name, {autoFork = true, cache}) {
        const Component = getComponentFromComponentMap(componentMap, name);

        if (autoFork) {
          let forkedComponents = cache.forkedComponents;

          if (forkedComponents === undefined) {
            forkedComponents = Object.create(null);
            cache.forkedComponents = forkedComponents;
          }

          let ForkedComponent = forkedComponents[name];

          if (ForkedComponent === undefined) {
            ForkedComponent = Component.fork();
            forkedComponents[name] = ForkedComponent;
          }

          return ForkedComponent;
        }

        return Component;
      },

      getComponentNames() {
        return Object.keys(componentMap);
      }
    };

    const server = new ComponentServer(componentProvider);

    const introspection = server.receiveQuery({'introspect=>': {'()': []}});

    expect(introspection).toStrictEqual({
      components: [
        {
          name: 'Movie',
          type: 'Component',
          properties: [{name: 'find', type: 'method', exposure: {call: true}}],
          prototype: {
            properties: [
              {
                name: 'title',
                type: 'attribute',
                default: {__function: "function () {\n        return '';\n      }"},
                exposure: {get: true, set: true}
              }
            ]
          }
        },
        {
          name: 'Cinema',
          type: 'Component',
          relatedComponents: ['Movie'],
          prototype: {
            properties: [
              {
                name: 'movies',
                type: 'attribute',
                exposure: {get: true}
              }
            ]
          }
        }
      ]
    });

    expect(() => server.receiveQuery({'introspect=>': {'()': []}}, {version: 1})).toThrow(
      "The component client version (1) doesn't match the component server version (undefined)"
    );
  });

  test('Introspecting models', async () => {
    class Movie extends Model {
      @expose({get: true, set: true})
      @attribute('string', {validators: [validators.notEmpty()]})
      title;
    }

    const server = new ComponentServer([Movie]);

    const introspection = server.receiveQuery({'introspect=>': {'()': []}});

    expect(introspection).toStrictEqual({
      components: [
        {
          name: 'Movie',
          type: 'Model',
          prototype: {
            properties: [
              {
                name: 'title',
                type: 'modelAttribute',
                valueType: 'string',
                validators: [
                  {
                    name: 'notEmpty',
                    function: {__function: 'value => value.length > 0'},
                    message: 'The validator `notEmpty()` failed'
                  }
                ],
                exposure: {get: true, set: true}
              }
            ]
          }
        }
      ]
    });
  });

  test('Introspecting entities', async () => {
    class User extends Entity {
      @expose({get: true, set: true})
      @primaryIdentifier()
      id;

      @expose({get: true, set: true})
      @secondaryIdentifier()
      email;
    }

    const server = new ComponentServer([User]);

    const introspection = server.receiveQuery({'introspect=>': {'()': []}});

    expect(introspection).toStrictEqual({
      components: [
        {
          name: 'User',
          type: 'Entity',
          prototype: {
            properties: [
              {
                name: 'id',
                type: 'primaryIdentifierAttribute',
                exposure: {get: true, set: true},
                default: {
                  __function: 'function () {\n    return this.constructor.generateId();\n  }'
                },
                valueType: 'string'
              },
              {
                name: 'email',
                type: 'secondaryIdentifierAttribute',
                exposure: {get: true, set: true},
                valueType: 'string'
              }
            ]
          }
        }
      ]
    });
  });

  test('Accessing attributes', async () => {
    class Movie extends Component {
      @attribute() static limit = 100;
      @expose({get: true, set: true}) static offset = 0;

      @expose({get: true, set: true}) title = '';
      @attribute() rating;
    }

    const server = new ComponentServer([Movie]);

    expect(
      server.receiveQuery({
        '<=': {__component: 'Movie'}
      })
    ).toStrictEqual({__component: 'Movie', offset: 0});

    expect(
      server.receiveQuery({
        '<=': {__component: 'Movie'},
        'offset': true
      })
    ).toStrictEqual({offset: 0});

    expect(() =>
      server.receiveQuery({
        '<=': {__component: 'Movie'},
        'limit': true
      })
    ).toThrow("Cannot get the value of an attribute that is not allowed (name: 'limit')");

    expect(
      server.receiveQuery({
        '<=': {__component: 'movie', __new: true}
      })
    ).toStrictEqual({__component: 'movie', __new: true, title: ''});

    expect(
      server.receiveQuery({
        '<=': {__component: 'movie', __new: true},
        'title': true
      })
    ).toStrictEqual({title: ''});

    expect(
      server.receiveQuery({
        '<=': {__component: 'movie', __new: true, title: 'Inception'}
      })
    ).toStrictEqual({__component: 'movie', __new: true, title: 'Inception'});

    expect(
      server.receiveQuery({
        '<=': {__component: 'movie', __new: true, title: 'Inception'},
        'title': true
      })
    ).toStrictEqual({title: 'Inception'});

    expect(
      server.receiveQuery({
        '<=': {__component: 'movie'}
      })
    ).toStrictEqual({__component: 'movie'});

    expect(() =>
      server.receiveQuery({
        '<=': {__component: 'movie'},
        'title': true
      })
    ).toThrow(
      "Cannot get the value of an unset attribute (component name: 'movie', attribute name: 'title')"
    );

    expect(
      server.receiveQuery({
        '<=': {__component: 'movie', rating: 10}
      })
    ).toStrictEqual({__component: 'movie'});

    expect(() =>
      server.receiveQuery({
        '<=': {__component: 'movie', rating: 10},
        'rating': true
      })
    ).toThrow(
      "Cannot get the value of an unset attribute (component name: 'movie', attribute name: 'rating')"
    );
  });

  test('Invoking methods', async () => {
    class Movie extends Component {
      @expose({call: true}) static exposedClassMethod() {
        return 'exposedClassMethod()';
      }

      @expose({call: true}) static async exposedAsyncClassMethod() {
        return 'exposedAsyncClassMethod()';
      }

      static unexposedClassMethod() {
        return 'unexposedClassMethod()';
      }

      @expose({call: true}) exposedInstanceMethod() {
        return 'exposedInstanceMethod()';
      }

      @expose({call: true}) async exposedAsyncInstanceMethod() {
        return 'exposedAsyncInstanceMethod()';
      }

      unexposedInstanceMethod() {
        return 'unexposedInstanceMethod()';
      }

      @expose({call: true}) exposedInstanceMethodWithParameters(param1, param2) {
        return `exposedInstanceMethodWithParameters(${param1}, ${param2})`;
      }
    }

    const server = new ComponentServer([Movie]);

    expect(
      server.receiveQuery({
        '<=': {__component: 'Movie'},
        'exposedClassMethod=>': {
          '()': []
        }
      })
    ).toBe('exposedClassMethod()');

    expect(
      await server.receiveQuery({
        '<=': {__component: 'Movie'},
        'exposedAsyncClassMethod=>': {
          '()': []
        }
      })
    ).toBe('exposedAsyncClassMethod()');

    expect(() =>
      server.receiveQuery({
        '<=': {__component: 'Movie'},
        'unexposedClassMethod=>': {
          '()': []
        }
      })
    ).toThrow("Cannot execute a method that is not allowed (name: 'unexposedClassMethod')");

    expect(
      server.receiveQuery({
        '<=': {__component: 'movie'},
        'exposedInstanceMethod=>': {
          '()': []
        }
      })
    ).toBe('exposedInstanceMethod()');

    expect(
      await server.receiveQuery({
        '<=': {__component: 'movie'},
        'exposedAsyncInstanceMethod=>': {
          '()': []
        }
      })
    ).toBe('exposedAsyncInstanceMethod()');

    expect(() =>
      server.receiveQuery({
        '<=': {__component: 'movie'},
        'unexposedInstanceMethod=>': {
          '()': []
        }
      })
    ).toThrow("Cannot execute a method that is not allowed (name: 'unexposedInstanceMethod')");

    expect(
      server.receiveQuery({
        '<=': {__component: 'movie'},
        'exposedInstanceMethodWithParameters=>': {
          '()': [1, 2]
        }
      })
    ).toBe('exposedInstanceMethodWithParameters(1, 2)');
  });
});

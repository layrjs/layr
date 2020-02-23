import {Component, property, expose} from '@liaison/component';

import {ComponentServer} from '../../..';

describe('ComponentServer', () => {
  test('Introspecting components', async () => {
    const provider = function() {
      class Movie extends Component() {
        @expose({call: true}) static find() {}
        @property() static limit;

        @expose({get: true, set: true}) title = '';
        @property() rating;
      }

      return [Movie];
    };

    const server = new ComponentServer(provider);

    const introspection = server.receiveQuery({'introspect=>': {'()': []}});

    expect(introspection).toStrictEqual({
      components: [
        {
          name: 'Movie',
          properties: [{name: 'find', type: 'method', exposure: {call: true}}],
          prototype: {
            properties: [
              {
                name: 'title',
                type: 'attribute',
                default: {__function: "function () {\n          return '';\n        }"},
                exposure: {get: true, set: true}
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

  test('Accessing attributes', async () => {
    const provider = function() {
      class Movie extends Component() {
        @property() static limit = 100;
        @expose({get: true, set: true}) static offset = 0;

        @expose({get: true, set: true}) title = '';
        @property() rating;
      }

      return [Movie];
    };

    const server = new ComponentServer(provider);

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
    ).toThrow("Cannot get the value from the 'title' attribute which is inactive");

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
    ).toThrow("Cannot get the value from the 'rating' attribute which is inactive");
  });

  test('Invoking methods', async () => {
    const provider = function() {
      class Movie extends Component() {
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

      return [Movie];
    };

    const server = new ComponentServer(provider);

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

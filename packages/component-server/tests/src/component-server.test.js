import {Component, property, expose} from '@liaison/component';

import {ComponentServer} from '../../..';

describe('ComponentServer', () => {
  test('Introspecting components', async () => {
    const provider = function() {
      class Movie extends Component() {
        @expose({call: true}) static find() {}
        @property() static limit;

        @expose({get: true, set: true}) title;
        @property() rating;
      }

      return [Movie];
    };

    const server = new ComponentServer(provider);

    const introspection = server.receiveQuery({'introspect=>': {'()': []}});

    expect(introspection).toEqual({
      components: [
        {
          name: 'Movie',
          properties: [{name: 'find', exposure: {call: true}}],
          prototype: {properties: [{name: 'title', exposure: {get: true, set: true}}]}
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
        '<=': {__Component: 'Movie'}
      })
    ).toEqual({__Component: 'Movie', offset: 0});

    expect(
      server.receiveQuery({
        '<=': {__Component: 'Movie'},
        'offset': true
      })
    ).toEqual({offset: 0});

    expect(() =>
      server.receiveQuery({
        '<=': {__Component: 'Movie'},
        'limit': true
      })
    ).toThrow("Cannot get the value of an attribute that is not allowed (name: 'limit')");

    expect(
      server.receiveQuery({
        '<=': {__component: 'Movie', __new: true}
      })
    ).toEqual({__component: 'Movie', __new: true, title: ''});

    expect(
      server.receiveQuery({
        '<=': {__component: 'Movie', __new: true},
        'title': true
      })
    ).toEqual({title: ''});

    expect(
      server.receiveQuery({
        '<=': {__component: 'Movie', __new: true, title: 'Inception'}
      })
    ).toEqual({__component: 'Movie', __new: true, title: 'Inception'});

    expect(
      server.receiveQuery({
        '<=': {__component: 'Movie', __new: true, title: 'Inception'},
        'title': true
      })
    ).toEqual({title: 'Inception'});

    expect(
      server.receiveQuery({
        '<=': {__component: 'Movie'}
      })
    ).toEqual({__component: 'Movie'});

    expect(
      server.receiveQuery({
        '<=': {__component: 'Movie'},
        'title': true
      })
    ).toEqual({title: {__undefined: true}});

    expect(
      server.receiveQuery({
        '<=': {__component: 'Movie', rating: 10}
      })
    ).toEqual({__component: 'Movie'});

    expect(() =>
      server.receiveQuery({
        '<=': {__component: 'Movie', rating: 10},
        'rating': true
      })
    ).toThrow("Cannot get the value of an attribute that is not allowed (name: 'rating')");
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
        '<=': {__Component: 'Movie'},
        'exposedClassMethod=>': {
          '()': []
        }
      })
    ).toBe('exposedClassMethod()');

    expect(
      await server.receiveQuery({
        '<=': {__Component: 'Movie'},
        'exposedAsyncClassMethod=>': {
          '()': []
        }
      })
    ).toBe('exposedAsyncClassMethod()');

    expect(() =>
      server.receiveQuery({
        '<=': {__Component: 'Movie'},
        'unexposedClassMethod=>': {
          '()': []
        }
      })
    ).toThrow("Cannot execute a method that is not allowed (name: 'unexposedClassMethod')");

    expect(
      server.receiveQuery({
        '<=': {__component: 'Movie'},
        'exposedInstanceMethod=>': {
          '()': []
        }
      })
    ).toBe('exposedInstanceMethod()');

    expect(
      await server.receiveQuery({
        '<=': {__component: 'Movie'},
        'exposedAsyncInstanceMethod=>': {
          '()': []
        }
      })
    ).toBe('exposedAsyncInstanceMethod()');

    expect(() =>
      server.receiveQuery({
        '<=': {__component: 'Movie'},
        'unexposedInstanceMethod=>': {
          '()': []
        }
      })
    ).toThrow("Cannot execute a method that is not allowed (name: 'unexposedInstanceMethod')");

    expect(
      server.receiveQuery({
        '<=': {__component: 'Movie'},
        'exposedInstanceMethodWithParameters=>': {
          '()': [1, 2]
        }
      })
    ).toBe('exposedInstanceMethodWithParameters(1, 2)');
  });
});

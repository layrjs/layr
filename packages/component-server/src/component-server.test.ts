import {
  Component,
  attribute,
  primaryIdentifier,
  secondaryIdentifier,
  method,
  expose,
  provide,
  consume,
  validators
} from '@liaison/component';
import {PlainObject, forEachDeep} from 'core-helpers';

import {ComponentServer} from './component-server';

describe('ComponentServer', () => {
  test('Introspecting components', async () => {
    class Session extends Component {
      @expose({get: true, set: true}) @attribute('string?') static token?: string;
    }

    class Movie extends Component {
      @consume() static Session: typeof Session;

      @expose({call: true}) @method() static find() {}
      @method() static count() {}

      @expose({get: true, set: true}) @primaryIdentifier() id!: string;
      @expose({get: true, set: true}) @secondaryIdentifier() slug!: string;
      @expose({get: true, set: true})
      @attribute('string', {validators: [validators.notEmpty()]})
      title = '';
      @expose({get: true}) @attribute('boolean') isPlaying = false;
      @expose({call: true}) @method() play() {}
      @method() delete() {}
    }

    class Backend extends Component {
      @provide() static Session = Session;
      @provide() static Movie = Movie;
    }

    const server = new ComponentServer(Backend);

    const response = server.receive({query: {'introspect=>': {'()': []}}});
    trimSerializedFunctions(response);

    expect(response).toStrictEqual({
      result: {
        component: {
          name: 'Backend',
          providedComponents: [
            {
              name: 'Session',
              properties: [
                {
                  name: 'token',
                  type: 'Attribute',
                  valueType: 'string?',
                  value: {__undefined: true},
                  exposure: {get: true, set: true}
                }
              ]
            },
            {
              name: 'Movie',
              properties: [{name: 'find', type: 'Method', exposure: {call: true}}],
              prototype: {
                properties: [
                  {
                    name: 'id',
                    type: 'PrimaryIdentifierAttribute',
                    valueType: 'string',
                    default: {
                      __function: 'function () {\nreturn this.constructor.generateId();\n}'
                    },
                    exposure: {get: true, set: true}
                  },
                  {
                    name: 'slug',
                    type: 'SecondaryIdentifierAttribute',
                    valueType: 'string',
                    exposure: {get: true, set: true}
                  },
                  {
                    name: 'title',
                    type: 'Attribute',
                    valueType: 'string',
                    default: {__function: "function () {\nreturn '';\n}"},
                    validators: [
                      {
                        name: 'notEmpty',
                        function: {__function: '(value) => value.length > 0'},
                        message: 'The validator `notEmpty()` failed'
                      }
                    ],
                    exposure: {get: true, set: true}
                  },
                  {
                    name: 'isPlaying',
                    type: 'Attribute',
                    valueType: 'boolean',
                    exposure: {get: true}
                  },
                  {name: 'play', type: 'Method', exposure: {call: true}}
                ]
              },
              consumedComponents: ['Session']
            }
          ]
        }
      }
    });

    expect(() => server.receive({query: {'introspect=>': {'()': []}}, version: 1})).toThrow(
      "The component client version (1) doesn't match the component server version (undefined)"
    );

    function trimSerializedFunctions(object: PlainObject) {
      forEachDeep(object, (value, name, node) => {
        if (name === '__function') {
          (node as any).__function = value.replace(/\n +/g, '\n');
        }
      });
    }
  });

  test('Accessing attributes', async () => {
    class Movie extends Component {
      @attribute('number') static limit = 100;
      @expose({get: true, set: true}) @attribute('number') static offset = 0;

      @expose({get: true, set: true}) @primaryIdentifier('string') id!: string;
      @expose({get: true, set: true}) @attribute('string') title = '';
      @attribute('number?') rating?: number;
    }

    const server = new ComponentServer(Movie);

    expect(
      server.receive({
        query: {'<=': {__component: 'typeof Movie'}}
      })
    ).toStrictEqual({
      result: {__component: 'typeof Movie', offset: 0}
    });

    expect(
      server.receive({
        query: {
          '<=': {__component: 'typeof Movie'},
          'offset': true
        }
      })
    ).toStrictEqual({
      result: {offset: 0},
      components: [{__component: 'typeof Movie', offset: 0}]
    });

    expect(
      server.receive({
        query: {
          '<=': {__component: 'typeof Movie'},
          'offset': true,
          'limit': true
        }
      })
    ).toStrictEqual({
      result: {
        offset: 0,
        limit: {__error: "Cannot get the value of an attribute that is not allowed (name: 'limit')"}
      },
      components: [{__component: 'typeof Movie', offset: 0}]
    });

    expect(
      server.receive({
        query: {
          '<=': {__component: 'Movie', __new: true, id: 'm1'}
        }
      })
    ).toStrictEqual({
      result: {__component: 'Movie', id: 'm1', title: ''},
      components: [{__component: 'typeof Movie', offset: 0}]
    });

    expect(
      server.receive({
        query: {
          '<=': {__component: 'Movie', __new: true, id: 'm1'},
          'title': true
        },
        components: [{__component: 'typeof Movie', offset: 0}]
      })
    ).toStrictEqual({
      result: {title: ''},
      components: [{__component: 'Movie', id: 'm1', title: ''}]
    });

    expect(
      server.receive({
        query: {
          '<=': {__component: 'Movie', __new: true, id: 'm1', title: 'Inception'}
        }
      })
    ).toStrictEqual({
      result: {__component: 'Movie', id: 'm1'},
      components: [{__component: 'typeof Movie', offset: 0}]
    });

    expect(
      server.receive({
        query: {
          '<=': {__component: 'Movie', __new: true, id: 'm1', title: 'Inception'},
          'title': true
        }
      })
    ).toStrictEqual({
      result: {title: 'Inception'},
      components: [{__component: 'typeof Movie', offset: 0}]
    });

    expect(
      server.receive({
        query: {
          '<=': {__component: 'Movie', id: 'm1'}
        }
      })
    ).toStrictEqual({
      result: {__component: 'Movie', id: 'm1'},
      components: [{__component: 'typeof Movie', offset: 0}]
    });

    expect(
      server.receive({
        query: {
          '<=': {__component: 'Movie', id: 'm1'},
          'title': true
        }
      })
    ).toStrictEqual({
      result: {
        title: {
          __error:
            "Cannot get the value of an unset attribute (component: 'Movie', attribute: 'title')"
        }
      },
      components: [{__component: 'typeof Movie', offset: 0}]
    });

    expect(
      server.receive({
        query: {
          '<=': {__component: 'Movie', id: 'm1', rating: 10}
        }
      })
    ).toStrictEqual({
      result: {__component: 'Movie', id: 'm1'},
      components: [{__component: 'typeof Movie', offset: 0}]
    });

    expect(
      server.receive({
        query: {
          '<=': {__component: 'Movie', id: 'm1', rating: 10},
          'rating': true
        }
      })
    ).toStrictEqual({
      result: {
        rating: {
          __error:
            "Cannot get the value of an unset attribute (component: 'Movie', attribute: 'rating')"
        }
      },
      components: [{__component: 'typeof Movie', offset: 0}]
    });
  });

  test('Invoking methods', async () => {
    class Movie extends Component {
      @expose({call: true}) @method() static exposedClassMethod() {
        return 'exposedClassMethod()';
      }

      @expose({call: true}) @method() static async exposedAsyncClassMethod() {
        return 'exposedAsyncClassMethod()';
      }

      @method() static unexposedClassMethod() {
        return 'unexposedClassMethod()';
      }

      @expose({call: true}) @method() exposedInstanceMethod() {
        return 'exposedInstanceMethod()';
      }

      @expose({call: true}) @method() async exposedAsyncInstanceMethod() {
        return 'exposedAsyncInstanceMethod()';
      }

      @method() unexposedInstanceMethod() {
        return 'unexposedInstanceMethod()';
      }

      @expose({call: true}) @method() exposedInstanceMethodWithParameters(
        param1: any,
        param2: any
      ) {
        return `exposedInstanceMethodWithParameters(${param1}, ${param2})`;
      }
    }

    const server = new ComponentServer(Movie);

    expect(
      server.receive({
        query: {
          '<=': {__component: 'typeof Movie'},
          'exposedClassMethod=>': {
            '()': []
          }
        }
      })
    ).toStrictEqual({result: 'exposedClassMethod()'});

    expect(
      await server.receive({
        query: {
          '<=': {__component: 'typeof Movie'},
          'exposedAsyncClassMethod=>': {
            '()': []
          }
        }
      })
    ).toStrictEqual({result: 'exposedAsyncClassMethod()'});

    expect(
      server.receive({
        query: {
          '<=': {__component: 'typeof Movie'},
          'unexposedClassMethod=>': {
            '()': []
          }
        }
      })
    ).toStrictEqual({
      result: {
        __error: "Cannot execute a method that is not allowed (name: 'unexposedClassMethod')"
      }
    });

    expect(
      server.receive({
        query: {
          '<=': {__component: 'Movie'},
          'exposedInstanceMethod=>': {
            '()': []
          }
        }
      })
    ).toStrictEqual({result: 'exposedInstanceMethod()'});

    expect(
      await server.receive({
        query: {
          '<=': {__component: 'Movie'},
          'exposedAsyncInstanceMethod=>': {
            '()': []
          }
        }
      })
    ).toStrictEqual({result: 'exposedAsyncInstanceMethod()'});

    expect(
      server.receive({
        query: {
          '<=': {__component: 'Movie'},
          'unexposedInstanceMethod=>': {
            '()': []
          }
        }
      })
    ).toStrictEqual({
      result: {
        __error: "Cannot execute a method that is not allowed (name: 'unexposedInstanceMethod')"
      }
    });

    expect(
      server.receive({
        query: {
          '<=': {__component: 'Movie'},
          'exposedInstanceMethodWithParameters=>': {
            '()': [1, 2]
          }
        }
      })
    ).toStrictEqual({result: 'exposedInstanceMethodWithParameters(1, 2)'});
  });
});

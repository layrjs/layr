import {Component} from './component';
import {Method} from './method';

describe('Method', () => {
  test('Creation', async () => {
    class Movie extends Component {}

    const method = new Method('find', Movie);

    expect(Method.isMethod(method)).toBe(true);
    expect(method.getName()).toBe('find');
    expect(method.getParent()).toBe(Movie);
  });
});

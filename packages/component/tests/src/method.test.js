import {Method, isMethod} from '../../..';

describe('Method', () => {
  test('Creation', async () => {
    class Movie {}

    const method = new Method('find', Movie);

    expect(isMethod(method)).toBe(true);
    expect(method.getName()).toBe('find');
    expect(method.getParent()).toBe(Movie);
  });
});

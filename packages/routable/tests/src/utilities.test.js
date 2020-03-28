import {normalizeURL} from '../../..';

describe('Utilities', () => {
  test('normalizeURL()', async () => {
    const url = 'https://username:password@domain.com:80/path?query=1#fragment';
    const normalizedURL = normalizeURL(url);

    expect(normalizedURL).toBeInstanceOf(URL);
    expect(normalizedURL.toString()).toBe(url);
    expect(normalizeURL(normalizedURL)).toBe(normalizedURL);

    expect(normalizeURL('/movies').toString()).toBe('liaison:/movies');
    expect(normalizeURL('movies').toString()).toBe('liaison:/movies');

    expect(() => normalizeURL(123)).toThrow(
      "Expected a string or an URL instance, but received a value of type 'number'"
    );

    expect(() => normalizeURL('https://?')).toThrow(
      "The specified URL is invalid (URL: 'https://?')"
    );
  });
});

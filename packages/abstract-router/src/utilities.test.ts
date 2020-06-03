import {normalizeURL, stringifyURL} from './utilities';

describe('Utilities', () => {
  test('normalizeURL() and stringifyURL()', async () => {
    const url = 'https://username:password@domain.com:80/path?query=1#fragment';
    const normalizedURL = normalizeURL(url);

    expect(normalizedURL).toBeInstanceOf(URL);
    expect(stringifyURL(normalizedURL)).toBe(url);
    expect(normalizeURL(normalizedURL)).toBe(normalizedURL);

    expect(stringifyURL(normalizeURL('/movies'))).toBe('/movies');
    expect(stringifyURL(normalizeURL('movies'))).toBe('/movies');

    // @ts-ignore
    expect(() => normalizeURL(123)).toThrow(
      "Expected a string or an URL instance, but received a value of type 'number'"
    );

    expect(() => normalizeURL('https://?')).toThrow(
      "The specified URL is invalid (URL: 'https://?')"
    );
  });
});

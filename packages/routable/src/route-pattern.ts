import get from 'lodash/get';
import set from 'lodash/set';
import escapeRegExp from 'lodash/escapeRegExp';

export type RoutePattern = string;

export type RoutePathMatcher = (path: string) => Record<string, any> | undefined;
export type RoutePathGenerator = (identifiers?: Record<string, any>) => string;

const PATH_CHARACTER_REGEXP = /[A-Za-z0-9.\-_@/]/;
const IDENTIFIER_NAME_CHARACTER_REGEXP = /[A-Za-z0-9.]/;
const IDENTIFIER_VALUE_GROUP_PATTERN = '([^/]+)';

export function parseRoutePattern(pattern: RoutePattern) {
  const parts = splitRoutePattern(pattern);

  const regExpParts: string[] = [];
  const identifierNames: string[] = [];

  for (const part of parts) {
    if (part.startsWith(':')) {
      const name = part.slice(1);
      identifierNames.push(name);
      regExpParts.push(IDENTIFIER_VALUE_GROUP_PATTERN);
    } else {
      regExpParts.push(escapeRegExp(part));
    }
  }

  const regExp = new RegExp('^' + regExpParts.join('') + '\\/?$');

  const matcher: RoutePathMatcher = function (path) {
    const matches = path.match(regExp);

    if (matches === null) {
      return undefined;
    }

    const identifiers: Record<string, any> = {};

    for (let index = 0; index < identifierNames.length; index++) {
      const name = identifierNames[index];
      const value = decodeURIComponent(matches[index + 1]);
      set(identifiers, name, value);
    }

    return identifiers;
  };

  const generator: RoutePathGenerator = function (identifiers = {}) {
    let path = '';

    for (const part of parts) {
      if (part.startsWith(':')) {
        const name = part.slice(1);
        const value = get(identifiers, name);
        if (value === undefined || value === '') {
          throw new Error(
            `Couldn't build a route path from the route pattern '${pattern}' because the identifier '${name}' is missing`
          );
        }
        path += encodeURIComponent(value);
      } else {
        path += part;
      }
    }

    return path;
  };

  return {matcher, generator};
}

// '/projects/:slug/edit/' => ['projects', ':slug', '/edit']
function splitRoutePattern(pattern: RoutePattern) {
  let normalizedPattern = pattern;

  if (!normalizedPattern.startsWith('/')) {
    throw new Error(
      `Couldn't parse the route pattern '${pattern}' (a route pattern should always start with a '/')`
    );
  }

  if (normalizedPattern.length > 1 && normalizedPattern.endsWith('/')) {
    normalizedPattern = normalizedPattern.slice(0, -1);
  }

  const parts: string[] = [];

  let index = 0;
  let partContent = '';
  let partType: 'path' | 'identifier' = 'path';

  const flushPart = () => {
    if (partType === 'path') {
      if (partContent !== '') {
        parts.push(partContent);
        partContent = '';
      }
    } else {
      if (partContent !== '') {
        parts.push(':' + partContent);
        partContent = '';
      } else {
        throw new Error(
          `Couldn't parse the route pattern '${pattern}' (an identifier cannot be empty)`
        );
      }
    }
  };

  while (index <= normalizedPattern.length - 1) {
    const character = normalizedPattern[index++];

    if (partType === 'path') {
      if (PATH_CHARACTER_REGEXP.test(character)) {
        partContent += character;
      } else if (character === ':') {
        flushPart();
        partType = 'identifier';
      } else {
        throw new Error(
          `Couldn't parse the route pattern '${pattern}' (the character '${character}' cannot be used in a route pattern)`
        );
      }
    } else {
      if (IDENTIFIER_NAME_CHARACTER_REGEXP.test(character)) {
        partContent += character;
      } else if (character !== ':') {
        flushPart();
        partContent = character;
        partType = 'path';
      } else {
        throw new Error(
          `Couldn't parse the route pattern '${pattern}' (an identifier cannot be immediately followed by another identifier)`
        );
      }
    }
  }

  flushPart();

  return parts;
}

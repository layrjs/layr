import get from 'lodash/get';
import set from 'lodash/set';
import escapeRegExp from 'lodash/escapeRegExp';

export type Pattern = string;

export type PathMatcher = (path: string) => Record<string, any> | undefined;
export type PathGenerator = (identifiers?: Record<string, any>) => string;

const PATH_CHARACTER_REGEXP = /[A-Za-z0-9.\-_@/]/;
const IDENTIFIER_NAME_CHARACTER_REGEXP = /[A-Za-z0-9.]/;
const IDENTIFIER_VALUE_GROUP_PATTERN = '([^/]+)';

export function parsePattern(pattern: Pattern) {
  const {wrapperParts, regularParts, isCatchAll} = splitPattern(pattern);
  const allParts = [...wrapperParts, ...regularParts];

  const regExpParts: string[] = [];
  const identifierNames: string[] = [];

  for (const part of allParts) {
    if (part.startsWith(':')) {
      const name = part.slice(1);
      identifierNames.push(name);
      regExpParts.push(IDENTIFIER_VALUE_GROUP_PATTERN);
    } else {
      regExpParts.push(escapeRegExp(part));
    }
  }

  regExpParts.push('\\/?');

  if (isCatchAll) {
    regExpParts.push('.*');
  }

  const regExp = new RegExp('^' + regExpParts.join('') + '$');

  const matcher: PathMatcher = function (path) {
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

  const generate = function (parts: string[], identifiers = {}) {
    let path = '';

    for (const part of parts) {
      if (part.startsWith(':')) {
        const name = part.slice(1);
        const value = get(identifiers, name);
        if (value === undefined || value === '') {
          throw new Error(
            `Couldn't build a route (or wrapper) path from the pattern '${pattern}' because the identifier '${name}' is missing`
          );
        }
        path += encodeURIComponent(value);
      } else {
        path += part;
      }
    }

    return path;
  };

  const generator: PathGenerator = function (identifiers) {
    return generate(allParts, identifiers);
  };

  const wrapperGenerator: PathGenerator = function (identifiers) {
    return generate(wrapperParts, identifiers);
  };

  return {matcher, generator, wrapperGenerator, isCatchAll};
}

// '[/]projects/:slug/edit/' => [['/'], ['projects', ':slug', '/edit']]
function splitPattern(pattern: Pattern) {
  let normalizedPattern = pattern.trim();

  if (!(normalizedPattern.startsWith('/') || normalizedPattern.startsWith('[/'))) {
    throw new Error(
      `Couldn't parse the route (or wrapper) pattern '${pattern}' (a pattern should always start with a '/')`
    );
  }

  let isCatchAll: boolean;

  const wildcardIndex = normalizedPattern.indexOf('*');

  if (wildcardIndex !== -1) {
    if (wildcardIndex !== normalizedPattern.length - 1) {
      throw new Error(
        `Couldn't parse the route (or wrapper) pattern '${pattern}' (a wildcard character '*' is only allowed at the end of the pattern)`
      );
    }
    normalizedPattern = normalizedPattern.slice(0, -1);
    isCatchAll = true;
  } else {
    isCatchAll = false;
  }

  if (normalizedPattern !== '/' && normalizedPattern.endsWith('/') && !isCatchAll) {
    normalizedPattern = normalizedPattern.slice(0, -1);
  }

  const wrapperParts: string[] = [];
  const regularParts: string[] = [];

  let index = 0;
  let partSection: 'wrapper' | 'regular' = 'regular';
  let partType: 'path' | 'identifier' = 'path';
  let partContent = '';

  const flushPart = () => {
    const parts = partSection === 'wrapper' ? wrapperParts : regularParts;

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
          `Couldn't parse the route (or wrapper) pattern '${pattern}' (an identifier cannot be empty)`
        );
      }
    }
  };

  while (index <= normalizedPattern.length - 1) {
    const character = normalizedPattern[index++];

    if (character === '[') {
      if (partSection === 'regular') {
        flushPart();
        partSection = 'wrapper';
        partType = 'path';
      } else {
        throw new Error(
          `Couldn't parse the route (or wrapper) pattern '${pattern}' (encountered an unexpected opening wrapper delimiter '[')`
        );
      }
    } else if (character === ']') {
      if (partSection === 'wrapper') {
        flushPart();
        partSection = 'regular';
        partType = 'path';
      } else {
        throw new Error(
          `Couldn't parse the route (or wrapper) pattern '${pattern}' (encountered an unexpected closing wrapper delimiter ']')`
        );
      }
    } else if (partType === 'path') {
      if (PATH_CHARACTER_REGEXP.test(character)) {
        partContent += character;
      } else if (character === ':') {
        flushPart();
        partType = 'identifier';
      } else {
        throw new Error(
          `Couldn't parse the route (or wrapper) pattern '${pattern}' (the character '${character}' cannot be used in a pattern)`
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
          `Couldn't parse the route (or wrapper) pattern '${pattern}' (an identifier cannot be immediately followed by another identifier)`
        );
      }
    }
  }

  flushPart();

  if (partSection !== 'regular') {
    throw new Error(
      `Couldn't parse the route (or wrapper) pattern '${pattern}' (a closing wrapper delimiter ']' is missing)`
    );
  }

  return {wrapperParts, regularParts, isCatchAll};
}

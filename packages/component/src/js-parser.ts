import escapeRegExp from 'lodash/escapeRegExp';

export function getConstructorSourceCode(classSourceCode: string) {
  let index = classSourceCode.indexOf('constructor(');

  if (index === -1) {
    return undefined;
  }

  index = getIndexAfterTerminator(classSourceCode, [')'], index + 'constructor('.length);

  index = classSourceCode.indexOf('{', index);

  if (index === -1) {
    throw new Error(`Failed to get a constructor's implementation in the specified source code`);
  }

  const endIndex = getIndexAfterTerminator(classSourceCode, ['}'], index + 1);

  return classSourceCode.slice(index, endIndex);
}

export function getAttributeInitializerFromConstructorSourceCode(
  constructorSourceCode: string,
  attributeName: string
) {
  const regexp = new RegExp(`this\\.${escapeRegExp(attributeName)}\\s*=\\s*`);
  const attributeMatch = constructorSourceCode.match(regexp);

  if (attributeMatch === null) {
    return undefined;
  }

  const index = attributeMatch.index! + attributeMatch[0].length;
  const endIndex = getIndexAfterTerminator(constructorSourceCode, [';', ',', '}'], index);

  const initializerSourceCode = 'return ' + constructorSourceCode.slice(index, endIndex - 1);

  let initializer: Function;

  try {
    initializer = new Function(initializerSourceCode);
  } catch (error) {
    console.error(
      `An error occurred while getting the attribute initializer from a constructor source code (failed to create a function from \`${initializerSourceCode}\`)`
    );
    throw error;
  }

  Object.defineProperty(initializer, 'name', {
    value: `${attributeName}Initializer`,
    configurable: true
  });

  return initializer;
}

function getIndexAfterTerminator(
  sourceCode: string,
  terminators: string[],
  initialIndex = 0
): number {
  let index = initialIndex;

  while (index < sourceCode.length) {
    for (const terminator of terminators) {
      if (sourceCode.startsWith(terminator, index)) {
        return index + terminator.length;
      }
    }

    if (sourceCode.startsWith('/*', index)) {
      index = sourceCode.indexOf('*/', index + 2);

      if (index === -1) {
        throw new Error(`Couldn't find the comment terminator '*/' in the specified source code`);
      }

      index = index + 2;
      continue;
    }

    if (sourceCode.startsWith('//', index)) {
      index = sourceCode.indexOf('\n', index + 2);

      if (index === -1) {
        index = sourceCode.length;
      } else {
        index++;
      }

      continue;
    }

    const character = sourceCode[index];

    if (character === "'") {
      index = getIndexAfterStringTerminator(sourceCode, "'", index + 1);
      continue;
    }

    if (character === '"') {
      index = getIndexAfterStringTerminator(sourceCode, '"', index + 1);
      continue;
    }

    if (character === '`') {
      index = getIndexAfterStringTerminator(sourceCode, '`', index + 1);
      continue;
    }

    if (character === '(') {
      index = getIndexAfterTerminator(sourceCode, [')'], index + 1);
      continue;
    }

    if (character === '{') {
      index = getIndexAfterTerminator(sourceCode, ['}'], index + 1);
      continue;
    }

    if (character === '[') {
      index = getIndexAfterTerminator(sourceCode, [']'], index + 1);
      continue;
    }

    index++;
  }

  throw new Error(
    `Couldn't find a terminator in the specified source code (terminators: ${JSON.stringify(
      terminators
    )})`
  );
}

function getIndexAfterStringTerminator(
  sourceCode: string,
  terminator: string,
  initialIndex = 0
): number {
  let index = initialIndex;

  while (index < sourceCode.length) {
    const character = sourceCode[index];

    if (character === '\\') {
      index++;
      continue;
    }

    if (character === terminator) {
      return index + 1;
    }

    if (sourceCode.startsWith('${', index)) {
      index = getIndexAfterTerminator(sourceCode, ['}'], index + 2);
      continue;
    }

    index++;
  }

  throw new Error(
    `Couldn't find the string terminator ${JSON.stringify(terminator)} in the specified source code`
  );
}

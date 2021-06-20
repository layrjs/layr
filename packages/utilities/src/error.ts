export const DEFAULT_DISPLAY_MESSAGE = 'Sorry, something went wrong.';

export type ExtendedError = Error & ExtendedErrorAttributes;

type ExtendedErrorAttributes = Record<string, any> & {
  displayMessage?: string;
  code?: number | string;
};

export function createError(message?: string, attributes: ExtendedErrorAttributes = {}) {
  const error = new Error(message) as ExtendedError;

  for (const [name, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      error[name] = value;
    }
  }

  return error;
}

export function throwError(message?: string, attributes: ExtendedErrorAttributes = {}): never {
  throw createError(message, attributes);
}

export function formatError(error?: ExtendedError) {
  return error?.displayMessage ?? DEFAULT_DISPLAY_MESSAGE;
}

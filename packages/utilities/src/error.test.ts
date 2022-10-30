import {
  createError,
  throwError,
  formatError,
  DEFAULT_DISPLAY_MESSAGE,
  ExtendedError
} from './error';

describe('Error', () => {
  test('createError()', async () => {
    let error = createError();

    expect(error instanceof Error).toBe(true);
    expect(error.message).toBe('');
    expect('displayMessage' in error).toBe(false);
    expect('code' in error).toBe(false);

    error = createError('Movie not found');

    expect(error instanceof Error).toBe(true);
    expect(error.message).toBe('Movie not found');
    expect('displayMessage' in error).toBe(false);
    expect('code' in error).toBe(false);

    error = createError('Movie not found', {displayMessage: 'Sorry, the specified was not found.'});

    expect(error instanceof Error).toBe(true);
    expect(error.message).toBe('Movie not found');
    expect(error.displayMessage).toBe('Sorry, the specified was not found.');
    expect('code' in error).toBe(false);

    error = createError('Movie not found', {displayMessage: undefined, code: 'MOVIE_NOT_FOUND'});

    expect(error instanceof Error).toBe(true);
    expect(error.message).toBe('Movie not found');
    expect('displayMessage' in error).toBe(false);
    expect(error.code).toBe('MOVIE_NOT_FOUND');

    error = createError('Movie not found', {id: 'abc123'});

    expect(error instanceof Error).toBe(true);
    expect(error.message).toBe('Movie not found');
    expect('displayMessage' in error).toBe(false);
    expect('code' in error).toBe(false);
    expect(error.id).toBe('abc123');
  });

  test('throwError()', async () => {
    let error: ExtendedError;

    try {
      throwError('Movie not found', {displayMessage: 'Sorry, the specified was not found.'});
    } catch (err: any) {
      error = err;
    }

    expect(error instanceof Error).toBe(true);
    expect(error.message).toBe('Movie not found');
    expect(error.displayMessage).toBe('Sorry, the specified was not found.');
    expect('code' in error).toBe(false);
  });

  test('formatError()', async () => {
    expect(formatError()).toBe(DEFAULT_DISPLAY_MESSAGE);
    expect(formatError(new Error())).toBe(DEFAULT_DISPLAY_MESSAGE);
    expect(formatError(new Error('Movie not found'))).toBe(DEFAULT_DISPLAY_MESSAGE);
    expect(
      formatError(
        createError('Movie not found', {displayMessage: 'Sorry, the specified was not found.'})
      )
    ).toBe('Sorry, the specified was not found.');
  });
});

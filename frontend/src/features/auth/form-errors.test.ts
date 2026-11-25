import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { handleSubmitError, NETWORK_ERROR } from '@/features/auth/form-errors';

type Field = 'email' | 'password';
const setError = vi.fn();
const setFormError = vi.fn();
const fields = ['email', 'password'] as const;

const run = (err: unknown, byCode?: Record<string, string | readonly [Field, string]>) =>
  handleSubmitError<Record<Field, string>>(err, { setError, setFormError, fields, byCode });

beforeEach(() => vi.clearAllMocks());

describe('handleSubmitError', () => {
  it('shows the offline message for an error that did not come from the API', () => {
    run(new TypeError('Failed to fetch'));
    expect(setFormError).toHaveBeenCalledWith(NETWORK_ERROR);
  });

  it('puts each server field error under its field and focuses the first', () => {
    run(new ApiError(422, 'validation_failed', 'Check', { email: 'Bad email', password: 'Short' }));
    expect(setError).toHaveBeenNthCalledWith(
      1,
      'email',
      { message: 'Bad email' },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenNthCalledWith(
      2,
      'password',
      { message: 'Short' },
      { shouldFocus: false },
    );
    expect(setFormError).not.toHaveBeenCalled();
  });

  it('shows the real messages at the top when the field is not in this form', () => {
    run(
      new ApiError(422, 'validation_failed', 'Please check the highlighted fields.', {
        birthDate: 'Enter a date in the past.',
      }),
    );
    expect(setFormError).toHaveBeenCalledWith('Enter a date in the past.');
    expect(setError).not.toHaveBeenCalled();
  });

  it('tells the user how long to wait after too many attempts', () => {
    run(new ApiError(429, 'too_many_attempts', 'x', undefined, 900));
    expect(setFormError).toHaveBeenLastCalledWith('Too many attempts. Try again in 15 minutes.');
    run(new ApiError(429, 'too_many_attempts', 'x', undefined, 61));
    expect(setFormError).toHaveBeenLastCalledWith('Too many attempts. Try again in 2 minutes.');
    run(new ApiError(429, 'too_many_attempts', 'x', undefined, 30));
    expect(setFormError).toHaveBeenLastCalledWith('Too many attempts. Try again in 1 minute.');
    run(new ApiError(429, 'too_many_attempts', 'x'));
    expect(setFormError).toHaveBeenLastCalledWith(
      'Too many attempts. Please wait a moment and try again.',
    );
  });

  it('uses the form’s own table: a string is a form message, a pair goes under a field', () => {
    const table = { bad_login: 'Wrong details.', email_taken: ['email', 'Already used'] } as const;
    run(new ApiError(401, 'bad_login', 'x'), table);
    expect(setFormError).toHaveBeenCalledWith('Wrong details.');
    run(new ApiError(409, 'email_taken', 'x'), table);
    expect(setError).toHaveBeenCalledWith(
      'email',
      { message: 'Already used' },
      { shouldFocus: true },
    );
  });

  it('keeps a message for a field this form lacks, next to the ones it shows', () => {
    run(
      new ApiError(422, 'validation_failed', 'Please check the highlighted fields.', {
        email: 'Bad email',
        birthDate: 'Enter a date in the past.',
      }),
    );
    expect(setError).toHaveBeenCalledWith('email', { message: 'Bad email' }, { shouldFocus: true });
    expect(setFormError).toHaveBeenCalledWith('Enter a date in the past.');
  });

  it('shows the server message for any other code', () => {
    run(new ApiError(403, 'account_disabled', 'This account has been disabled.'));
    expect(setFormError).toHaveBeenCalledWith('This account has been disabled.');
  });
});

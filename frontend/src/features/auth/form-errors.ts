import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/api/client';

export const NETWORK_ERROR =
  "You're offline or the server can't be reached. Check your connection and try again.";

function tooManyAttempts(seconds?: number) {
  if (!seconds) return 'Too many attempts. Please wait a moment and try again.';
  const minutes = Math.ceil(seconds / 60);
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

interface SubmitErrorOptions<T extends FieldValues> {
  setError: UseFormSetError<T>;
  setFormError: (message: string) => void;
  // This form's own field names. A server error for any other field is shown at the top instead.
  fields: readonly Path<T>[];
  // This form's known error codes: a string is shown as the form message; [field, message] is
  // shown under that field.
  byCode?: Record<string, string | readonly [Path<T>, string]>;
}

// What every auth form does when its submit fails.
export function handleSubmitError<T extends FieldValues>(
  err: unknown,
  { setError, setFormError, fields, byCode = {} }: SubmitErrorOptions<T>,
) {
  if (!(err instanceof ApiError)) {
    setFormError(NETWORK_ERROR);
    return;
  }

  if (err.code === 'validation_failed') {
    const serverFields = Object.entries(err.fields ?? {});
    const isOnForm = ([name]: [string, string]) => (fields as readonly string[]).includes(name);
    const onForm = serverFields.filter(isOnForm);
    const elsewhere = serverFields.filter((entry) => !isOnForm(entry));

    onForm.forEach(([name, message], i) =>
      setError(name as Path<T>, { message }, { shouldFocus: i === 0 }),
    );
    // A message for a field this form does not have would be lost, so it goes at the top. With no
    // field at all, the server's own words beat "check the highlighted fields".
    if (elsewhere.length || !onForm.length) {
      setFormError(elsewhere.map(([, message]) => message).join(' ') || err.message);
    }
    return;
  }

  if (err.code === 'too_many_attempts') {
    setFormError(tooManyAttempts(err.retryAfter));
    return;
  }

  const known = Object.hasOwn(byCode, err.code) ? byCode[err.code] : undefined;
  if (typeof known === 'string') setFormError(known);
  else if (known) setError(known[0], { message: known[1] }, { shouldFocus: true });
  else setFormError(err.message);
}

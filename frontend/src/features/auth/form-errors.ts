import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiError } from '@/api/client';

export const NETWORK_ERROR =
  "You're offline or the server can't be reached. Check your connection and try again.";

// Puts the API's error.fields onto the matching form inputs.
export function setFieldErrors<T extends FieldValues>(err: ApiError, setError: UseFormSetError<T>) {
  Object.entries(err.fields ?? {}).forEach(([name, message], i) => {
    setError(name as Path<T>, { message }, { shouldFocus: i === 0 });
  });
}

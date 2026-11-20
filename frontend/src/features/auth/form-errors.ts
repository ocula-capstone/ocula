import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiError } from '@/api/client';

export const NETWORK_ERROR = 'Could not reach the server. Check your connection and try again.';

// Puts the API's error.fields onto the matching form inputs.
export function setFieldErrors<T extends FieldValues>(err: ApiError, setError: UseFormSetError<T>) {
  for (const [name, message] of Object.entries(err.fields ?? {})) {
    setError(name as Path<T>, { message });
  }
}

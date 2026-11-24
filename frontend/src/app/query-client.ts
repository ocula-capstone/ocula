import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';

// Retry only failures that may pass on their own: network errors and server (5xx) errors,
// at most twice. A 4xx means the request itself is wrong, so asking again changes nothing.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 2;
}

// The one shared cache for server data. Data counts as fresh for 30 seconds.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: shouldRetry } },
});

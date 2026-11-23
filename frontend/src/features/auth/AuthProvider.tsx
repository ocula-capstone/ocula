import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as authApi from '@/api/auth';
import { ApiError, configureClient } from '@/api/client';
import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context';
import type { AuthResponse, AuthTokens, AuthUser } from '@/types/auth';

const REFRESH_KEY = 'ocula.refreshToken';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const accessToken = useRef<string | null>(null);
  // Refresh tokens are one-time use, so concurrent 401s must share a single refresh call.
  const refreshing = useRef<Promise<string | null> | null>(null);

  const saveTokens = useCallback((t: AuthTokens) => {
    accessToken.current = t.accessToken;
    localStorage.setItem(REFRESH_KEY, t.refreshToken);
  }, []);

  const clearSession = useCallback(() => {
    accessToken.current = null;
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
  }, []);

  const refreshSession = useCallback(() => {
    refreshing.current ??= (async () => {
      const stored = localStorage.getItem(REFRESH_KEY);
      if (!stored) return null;
      try {
        const tokens = await authApi.refresh(stored);
        saveTokens(tokens);
        return tokens.accessToken;
      } catch (e) {
        // Only a rejected token ends the session; offline or 5xx keeps it for the next try.
        if (e instanceof ApiError && e.status === 401 && e.code === 'invalid_refresh_token') {
          clearSession();
        }
        return null;
      }
    })().finally(() => {
      refreshing.current = null;
    });
    return refreshing.current;
  }, [saveTokens, clearSession]);

  // Restore the session: /auth/me 401s with no access token, which triggers the refresh hook.
  useEffect(() => {
    configureClient({ getAccessToken: () => accessToken.current, refresh: refreshSession });
    let cancelled = false;
    const restore = localStorage.getItem(REFRESH_KEY)
      ? authApi.me().catch(() => null)
      : Promise.resolve(null);
    restore.then((u) => {
      if (cancelled) return;
      setUser(u);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const start = useCallback(
    (res: AuthResponse) => {
      saveTokens(res);
      setUser(res.user);
      return res.user;
    },
    [saveTokens],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login: async (data) => start(await authApi.login(data)),
      register: async (data) => start(await authApi.register(data)),
      logout: async () => {
        const stored = localStorage.getItem(REFRESH_KEY);
        clearSession();
        if (stored) await authApi.logout(stored).catch(() => undefined);
      },
    }),
    [user, isLoading, start, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

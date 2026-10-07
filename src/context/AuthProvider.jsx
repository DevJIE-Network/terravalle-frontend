import { useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '@/api';
import { setUnauthorizedHandler } from '@/api/client';
import { STORAGE_KEYS } from '@/utils/constants';
import { AuthContext } from './AuthContext';

function readStoredSession() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION));
    return session?.token && session?.user ? session : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  const login = useCallback(async ({ email, password }) => {
    const { user, token } = await authService.login({ email, password });
    const newSession = { user, token };

    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(newSession));
    setSession(newSession);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    setSession(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session),
      login,
      logout,
    }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

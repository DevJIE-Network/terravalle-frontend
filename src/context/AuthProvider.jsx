import { useCallback, useEffect, useMemo, useState } from 'react';
import { setUnauthorizedHandler } from '@/api/client';
import { STORAGE_KEYS } from '@/utils/constants';
import { AuthContext } from './AuthContext';
import { DEMO_CREDENTIALS, DEMO_TOKEN, DEMO_USER } from './demoSession';

/** Lee la sesión guardada en localStorage (sobrevive a recargas). */
function readStoredSession() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION));
    return session?.token && session?.user ? session : null;
  } catch {
    return null;
  }
}

/**
 * Proveedor global de sesión. Ya está montado en App.jsx.
 * @param {{ children: import('react').ReactNode }} props
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  /**
   * Inicia sesión.
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<object>} el usuario autenticado
   * @throws {Error} con mensaje en español si las credenciales no son válidas
   */
  const login = useCallback(async ({ email, password }) => {
    // TODO: conectar con POST /auth/login
    // import { authService } from '@/api';
    // const { user, token } = await authService.login({ email, password });
    // ---- Inicio de la simulación (borrar al conectar la API) ----
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (email !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password) {
      throw new Error('Correo o contraseña incorrectos.');
    }
    const user = DEMO_USER;
    const token = DEMO_TOKEN;
    // ---- Fin de la simulación ----

    const newSession = { user, token };
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(newSession));
    setSession(newSession);
    return user;
  }, []);

  /** Cierra la sesión y borra los datos guardados. */
  const logout = useCallback(() => {
    // TODO: si el backend agrega POST /auth/logout, llamarlo aquí.
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    setSession(null);
  }, []);

  // Si la API responde 401 (token vencido o inválido), se cierra la sesión automáticamente.
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

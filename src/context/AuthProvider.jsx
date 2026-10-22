import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '@/api';
import { setUnauthorizedHandler } from '@/api/client';
import { ROUTES, STORAGE_KEYS } from '@/utils/constants';
import { isTokenExpired } from '@/utils/helpers';
import { AuthContext } from './AuthContext';

/** Lee la sesión guardada en localStorage (sobrevive a recargas). */
function readStoredSession() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION));
    return session?.token && session?.user ? session : null;
  } catch {
    return null;
  }
}

function persistSession(session) {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  } catch {
    // Almacenamiento no disponible (modo privado, cuota llena): la sesión vive solo en memoria.
  }
}

function clearStoredSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  } catch {
    // Nada que borrar si el almacenamiento no está disponible.
  }
}

/** Estado inicial: si el token guardado ya venció, se descarta y se avisará al usuario. */
function loadInitialState() {
  const session = readStoredSession();
  if (session && isTokenExpired(session.token)) {
    clearStoredSession();
    return { session: null, sessionExpired: true };
  }
  return { session, sessionExpired: false };
}

/**
 * Proveedor global de sesión. Ya está montado en App.jsx (dentro de <BrowserRouter>).
 * @param {{ children: import('react').ReactNode }} props
 */
export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [{ session, sessionExpired }, setState] = useState(loadInitialState);

  // Copias "vivas" para que el manejador de 401 no dependa de renders anteriores.
  const sessionRef = useRef(session);
  const locationRef = useRef(location);
  useEffect(() => {
    sessionRef.current = session;
    locationRef.current = location;
  });

  /**
   * Inicia sesión contra POST /auth/login y guarda la sesión.
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<object>} el usuario autenticado
   * @throws {Error} con mensaje en español si las credenciales no son válidas
   */
  const login = useCallback(async ({ email, password }) => {
    const { user, token } = await authService.login({ email, password });

    const newSession = { user, token };
    persistSession(newSession);
    setState({ session: newSession, sessionExpired: false });
    return user;
  }, []);

  /**
   * Actualiza los datos del usuario en la sesión (por ejemplo, después de editar el perfil)
   * para que el resto de la app muestre la información vigente.
   * @param {object} changes campos del usuario que cambiaron
   */
  const updateUser = useCallback((changes) => {
    setState((previous) => {
      if (!previous.session) return previous;
      const session = { ...previous.session, user: { ...previous.session.user, ...changes } };
      persistSession(session);
      return { ...previous, session };
    });
  }, []);

  /** Cierra la sesión y borra los datos guardados en el dispositivo. */
  const logout = useCallback(() => {
    clearStoredSession();
    setState({ session: null, sessionExpired: false });
  }, []);

  /**
   * Sesión vencida o rechazada por el backend (401): borra la sesión local, marca el aviso y
   * redirige al inicio de sesión recordando la página en la que estaba.
   */
  const expireSession = useCallback(() => {
    if (!sessionRef.current) return;
    clearStoredSession();
    setState({ session: null, sessionExpired: true });
    navigate(ROUTES.LOGIN, { replace: true, state: { from: locationRef.current } });
  }, [navigate]);

  /** Oculta el aviso de "sesión expirada" una vez mostrado. */
  const clearSessionNotice = useCallback(() => {
    setState((previous) =>
      previous.sessionExpired ? { ...previous, sessionExpired: false } : previous,
    );
  }, []);

  // Si la API responde 401 (token vencido o inválido), se expira la sesión automáticamente.
  useEffect(() => {
    setUnauthorizedHandler(expireSession);
    return () => setUnauthorizedHandler(null);
  }, [expireSession]);

  // Mantiene sincronizadas las pestañas: si se cierra sesión en una, se cierra en todas.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== null && event.key !== STORAGE_KEYS.SESSION) return;
      setState({ session: readStoredSession(), sessionExpired: false });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session),
      sessionExpired,
      login,
      logout,
      updateUser,
      expireSession,
      clearSessionNotice,
    }),
    [session, sessionExpired, login, logout, updateUser, expireSession, clearSessionNotice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

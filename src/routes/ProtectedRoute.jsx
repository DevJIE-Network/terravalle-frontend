import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';
import { isTokenExpired } from '@/utils/helpers';

/**
 * Protege rutas que requieren sesión. Valida la sesión antes de mostrar la pantalla:
 * - Sin sesión: redirige a /login y guarda en `state.from` la página que se intentó abrir,
 *   para regresar a ella después de iniciar sesión (HU-018).
 * - Token vencido: elimina la sesión local, avisa al usuario y redirige a /login.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, token, expireSession } = useAuth();
  const location = useLocation();

  const hasValidSession = isAuthenticated && !isTokenExpired(token);

  useEffect(() => {
    if (isAuthenticated && !hasValidSession) {
      expireSession();
    }
  }, [isAuthenticated, hasValidSession, expireSession]);

  if (!hasValidSession) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

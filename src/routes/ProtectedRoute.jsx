import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';

/**
 * Protege rutas que requieren sesión.
 * Si no hay sesión, redirige a /login y guarda en `state.from` la página
 * que se intentó abrir, para regresar a ella después de iniciar sesión (HU-018).
 */
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

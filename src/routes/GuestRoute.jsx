import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { resolveRedirectPath } from '@/utils/helpers';

/**
 * Rutas solo para visitantes (/login, /registro).
 * Si el usuario ya inició sesión, lo manda a la página que intentaba abrir o al inicio.
 */
export default function GuestRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    return <Navigate to={resolveRedirectPath(location.state?.from)} replace />;
  }

  return <Outlet />;
}

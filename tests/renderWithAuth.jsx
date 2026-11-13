import { render } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { STORAGE_KEYS } from '@/utils/constants';

/** Muestra la ruta actual y el estado de sesión para comprobar redirecciones. */
export function LocationProbe() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  return (
    <>
      <p data-testid="pathname">{location.pathname}</p>
      <p data-testid="from">{location.state?.from?.pathname ?? ''}</p>
      <p data-testid="message">{location.state?.message ?? ''}</p>
      <p data-testid="session">{isAuthenticated ? (user?.name ?? user?.email) : 'sin sesión'}</p>
    </>
  );
}

/** Token JWT de prueba con el `exp` indicado (segundos desde 1970). */
export function buildToken(exp) {
  const encode = (value) => btoa(JSON.stringify(value)).replaceAll('=', '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: '1', exp })}.firma`;
}

/**
 * Renderiza rutas reales dentro de AuthProvider y un data router de memoria.
 * @param {Array<object>} routes rutas hijas (path + element)
 * @param {{ initialEntries?: Array<string|object>, session?: object|null }} options
 */
export function renderWithAuth(routes, { initialEntries = ['/'], session = null } = {}) {
  if (session) {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  }

  const router = createMemoryRouter(
    [
      {
        element: (
          <AuthProvider>
            <LocationProbe />
            <Outlet />
          </AuthProvider>
        ),
        children: routes,
      },
    ],
    { initialEntries },
  );

  return { router, ...render(<RouterProvider router={router} />) };
}

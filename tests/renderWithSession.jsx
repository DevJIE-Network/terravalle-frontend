import { render } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { STORAGE_KEYS } from '@/utils/constants';

/** Muestra el nombre guardado en la sesión para comprobar que se actualiza. */
function SessionName() {
  const { user } = useAuth();
  return <p data-testid="session-name">{user?.name ?? 'sin sesión'}</p>;
}

/**
 * Renderiza rutas de prueba dentro de un data router (necesario para useBlocker)
 * con una sesión iniciada en AuthProvider.
 */
export function renderWithSession(routes, { path, user = { name: 'Ana Pérez' } } = {}) {
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ token: 'token-de-prueba', user }));

  const router = createMemoryRouter(
    [
      {
        element: (
          <AuthProvider>
            <SessionName />
            <Outlet />
          </AuthProvider>
        ),
        children: [...routes, { path: '/', element: <p>Página de inicio</p> }],
      },
    ],
    { initialEntries: [path] },
  );

  return { router, ...render(<RouterProvider router={router} />) };
}

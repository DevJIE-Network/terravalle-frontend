import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as authService from '@/api/auth.service';
import DevAuthToggle from '@/components/dev/DevAuthToggle';
import { DEMO_CREDENTIALS } from '@/context/demoSession';
import ProtectedRoute from '@/routes/ProtectedRoute';
import { buildToken, renderWithAuth } from './renderWithAuth';

vi.mock('@/api/auth.service', async (importOriginal) => ({
  ...(await importOriginal()),
  login: vi.fn(),
}));

const FUTURE_EXP = 4_000_000_000; // año 2096

const ROUTES = [
  { path: '/', element: <p>Inicio público</p> },
  { path: '/login', element: <p>Pantalla de login</p> },
  {
    element: <ProtectedRoute />,
    children: [{ path: '/mis-propiedades', element: <p>Panel privado</p> }],
  },
];

describe('HU-018 · Rutas protegidas', () => {
  it('sin sesión redirige al login recordando la página solicitada', async () => {
    renderWithAuth(ROUTES, { initialEntries: ['/mis-propiedades'] });

    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
    expect(screen.queryByText('Panel privado')).not.toBeInTheDocument();
    expect(screen.getByTestId('from')).toHaveTextContent('/mis-propiedades');
  });

  it('con una sesión vigente muestra la pantalla privada', () => {
    renderWithAuth(ROUTES, {
      initialEntries: ['/mis-propiedades'],
      session: { token: buildToken(FUTURE_EXP), user: { name: 'Ana' } },
    });

    expect(screen.getByText('Panel privado')).toBeInTheDocument();
  });

  it('acepta tokens que no son JWT (sin fecha de vencimiento)', () => {
    renderWithAuth(ROUTES, {
      initialEntries: ['/mis-propiedades'],
      session: { token: 'token-opaco', user: { name: 'Ana' } },
    });

    expect(screen.getByText('Panel privado')).toBeInTheDocument();
  });

  it('si el token vence durante la sesión, la expira y manda al login', async () => {
    const { router } = renderWithAuth(ROUTES, {
      initialEntries: ['/'],
      session: { token: buildToken(2_000_000_000), user: { name: 'Ana' } },
    });
    expect(screen.getByTestId('session')).toHaveTextContent('Ana');

    // El reloj avanza después del vencimiento (año 2033).
    vi.spyOn(Date, 'now').mockReturnValue(2_000_000_001_000);
    await act(() => router.navigate('/mis-propiedades'));

    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
    expect(screen.getByTestId('session')).toHaveTextContent('sin sesión');
    expect(screen.getByTestId('from')).toHaveTextContent('/mis-propiedades');
  });
});

describe('DevAuthToggle (solo desarrollo)', () => {
  it('alterna entre visitante y sesión de demostración', async () => {
    const user = userEvent.setup();
    authService.login.mockResolvedValue({ user: { name: 'Usuario de prueba' }, token: 'demo' });
    renderWithAuth([{ path: '/', element: <DevAuthToggle /> }]);

    await user.click(screen.getByRole('button', { name: /Visitante → entrar/ }));
    expect(authService.login).toHaveBeenCalledWith(DEMO_CREDENTIALS);
    expect(await screen.findByRole('button', { name: /Autenticado → salir/ })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /Autenticado → salir/ }));
    expect(screen.getByRole('button', { name: /Visitante → entrar/ })).toBeInTheDocument();
    expect(screen.getByTestId('session')).toHaveTextContent('sin sesión');
  });
});

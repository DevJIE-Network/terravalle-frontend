import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api';
import MainLayout from '@/components/layout/MainLayout';
import OfflineBanner from '@/components/layout/OfflineBanner';
import { AuthProvider } from '@/context/AuthProvider';
import CatalogPage from '@/pages/Catalog/CatalogPage';
import RequiresConnection from '@/routes/RequiresConnection';
import { ROUTES } from '@/utils/constants';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getPublicProperties: vi.fn(),
  getPublicServiceCatalog: vi.fn(),
}));

let online = true;

function goOffline() {
  online = false;
  act(() => {
    window.dispatchEvent(new Event('offline'));
  });
}

function goOnline() {
  online = true;
  act(() => {
    window.dispatchEvent(new Event('online'));
  });
}

function OnlineOnlyForm() {
  return (
    <form>
      <h1>Publicar propiedad</h1>
      <label>
        Título
        <input name="title" defaultValue="Terreno en Tula" />
      </label>
      <button type="submit">Guardar</button>
    </form>
  );
}

function renderRoutes(path, children) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        ),
        children: [{ element: <MainLayout />, children }],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  online = true;
  vi.clearAllMocks();
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
  api.getPublicServiceCatalog.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('acciones que requieren Internet', () => {
  const routes = [
    {
      element: <RequiresConnection />,
      children: [{ path: '/publicar', element: <OnlineOnlyForm /> }],
    },
  ];

  it('con conexión el formulario funciona normal', () => {
    renderRoutes('/publicar', routes);

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
    expect(screen.queryByText('Esta sección requiere conexión')).not.toBeInTheDocument();
  });

  it('sin conexión explica el motivo, deshabilita el envío y conserva lo escrito', () => {
    renderRoutes('/publicar', routes);
    goOffline();

    expect(screen.getByText('Esta sección requiere conexión')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    expect(screen.getByLabelText('Título')).toBeDisabled();
    expect(screen.getByLabelText('Título')).toHaveValue('Terreno en Tula');

    goOnline();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });
});

describe('aviso global de conexión', () => {
  it('avisa sin conexión y, al volver, informa que se actualiza por unos segundos', () => {
    vi.useFakeTimers();
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    goOffline();
    expect(screen.getByRole('status')).toHaveTextContent(/Sin conexión/);
    expect(screen.getByRole('status')).toHaveTextContent(/puede no estar actualizada/);

    goOnline();
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Conexión restablecida');

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('catálogo al recuperar la conexión', () => {
  it('vuelve a consultar solo cuando regresa la conexión', async () => {
    online = false;
    api.getPublicProperties
      .mockRejectedValueOnce(
        Object.assign(new Error('Sin red'), { status: null, code: 'ERR_NETWORK' }),
      )
      .mockResolvedValueOnce({
        properties: [],
        pagination: { page: 1, limit: 12, total: 0, totalPages: 0, hasNextPage: false },
      });
    renderRoutes(ROUTES.CATALOG, [{ path: ROUTES.CATALOG, element: <CatalogPage /> }]);

    expect(await screen.findByText('El catálogo requiere conexión')).toBeInTheDocument();
    expect(api.getPublicProperties).toHaveBeenCalledTimes(1);

    goOnline();

    await vi.waitFor(() => expect(api.getPublicProperties).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('El catálogo requiere conexión')).not.toBeInTheDocument();
  });
});

import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api';
import MainLayout from '@/components/layout/MainLayout';
import { AuthProvider } from '@/context/AuthProvider';
import CatalogPage from '@/pages/Catalog/CatalogPage';
import PublicPropertyPage from '@/pages/PublicProperty/PublicPropertyPage';
import { ROUTES } from '@/utils/constants';
import { getOfflineProperty, saveOfflineProperty } from '@/utils/offlineProperties';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getPublicProperty: vi.fn(),
  getPublicProperties: vi.fn(),
  getPublicServiceCatalog: vi.fn(),
  getPropertyContact: vi.fn(),
  favoriteService: { listFavorites: vi.fn(), addFavorite: vi.fn(), removeFavorite: vi.fn() },
}));

const PROPERTY = {
  id: '15',
  title: 'Casa con alberca en Marina Vallarta',
  description: 'Casa de dos plantas.',
  propertyType: { id: 2, name: 'Casa' },
  publicationPrice: 6850000,
  photos: [],
  location: {
    street: 'Paseo de la Marina',
    municipality: 'Puerto Vallarta',
    state: 'Jalisco',
    latitude: 20.66,
    longitude: -105.25,
  },
  nearbyPlaces: [],
  services: [],
};

let online = true;

function setOnline(value) {
  online = value;
  act(() => {
    window.dispatchEvent(new Event(value ? 'online' : 'offline'));
  });
}

function networkError() {
  return Object.assign(new Error('No hay conexión con el servidor.'), {
    status: null,
    code: 'ERR_NETWORK',
  });
}

function renderAt(path) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        ),
        children: [
          {
            element: <MainLayout />,
            children: [
              { path: ROUTES.PUBLIC_PROPERTY, element: <PublicPropertyPage /> },
              { path: ROUTES.CATALOG, element: <CatalogPage /> },
            ],
          },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  online = true;
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
  api.getPublicServiceCatalog.mockResolvedValue([]);
});

afterEach(() => vi.restoreAllMocks());

describe('consulta sin conexión de fichas ya abiertas', () => {
  it('guarda una copia de la ficha al consultarla con conexión', async () => {
    api.getPublicProperty.mockResolvedValue({ property: PROPERTY, notes: {} });
    renderAt('/propiedades/15');

    await screen.findByRole('heading', { level: 1, name: PROPERTY.title });
    expect(getOfflineProperty('15')?.property.title).toBe(PROPERTY.title);
    expect(screen.queryByText(/copia guardada/)).not.toBeInTheDocument();
  });

  it('sin conexión muestra la copia guardada, la identifica y bloquea lo que requiere Internet', async () => {
    saveOfflineProperty(PROPERTY, {}, Date.now() - 60_000);
    online = false;
    api.getPublicProperty.mockRejectedValue(networkError());
    renderAt('/propiedades/15');

    expect(
      await screen.findByRole('heading', { level: 1, name: PROPERTY.title }),
    ).toBeInTheDocument();
    expect(screen.getByText('Estás viendo una copia guardada sin conexión')).toBeInTheDocument();
    expect(screen.getByText(/pueden no estar actualizados/)).toBeInTheDocument();
    expect(screen.getByText(/Sin conexión\./)).toBeInTheDocument();
    expect(screen.queryByText('No pudimos cargar la propiedad')).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Contactar vendedor' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Guardar en favoritos/ })).toBeDisabled();
    expect(screen.getByText('El mapa requiere conexión a Internet.')).toBeInTheDocument();
    expect(screen.queryByTitle(/Mapa de la ubicación/)).not.toBeInTheDocument();
  });

  it('informa que una ficha nunca abierta requiere conexión', async () => {
    online = false;
    api.getPublicProperty.mockRejectedValue(networkError());
    renderAt('/propiedades/99');

    expect(
      await screen.findByRole('heading', { name: 'Esta propiedad requiere conexión' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al catálogo' })).toHaveAttribute(
      'href',
      ROUTES.CATALOG,
    );
  });

  it('al volver la conexión obtiene la versión vigente', async () => {
    saveOfflineProperty(PROPERTY, {}, Date.now() - 60_000);
    online = false;
    api.getPublicProperty.mockRejectedValueOnce(networkError()).mockResolvedValueOnce({
      property: { ...PROPERTY, title: 'Casa con alberca (precio actualizado)' },
      notes: {},
    });
    renderAt('/propiedades/15');
    await screen.findByText('Estás viendo una copia guardada sin conexión');

    setOnline(true);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Casa con alberca (precio actualizado)',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Estás viendo una copia guardada sin conexión'),
    ).not.toBeInTheDocument();
    expect(getOfflineProperty('15')?.property.title).toBe('Casa con alberca (precio actualizado)');
  });

  it('permite actualizar a mano cuando hay conexión pero se mostró la copia', async () => {
    const user = userEvent.setup();
    saveOfflineProperty(PROPERTY, {}, Date.now() - 60_000);
    api.getPublicProperty
      .mockRejectedValueOnce(Object.assign(networkError(), { code: 'ECONNABORTED' }))
      .mockResolvedValueOnce({ property: PROPERTY, notes: {} });
    renderAt('/propiedades/15');

    await user.click(await screen.findByRole('button', { name: 'Actualizar ahora' }));
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(
      screen.queryByText('Estás viendo una copia guardada sin conexión'),
    ).not.toBeInTheDocument();
    expect(api.getPublicProperty).toHaveBeenCalledTimes(2);
  });

  it('no usa la copia ante errores del servidor y la borra si la ficha ya no está disponible', async () => {
    saveOfflineProperty(PROPERTY, {}, Date.now());
    api.getPublicProperty.mockRejectedValue(
      Object.assign(new Error('No disponible'), { status: 410 }),
    );
    renderAt('/propiedades/15');

    expect(
      await screen.findByRole('heading', { name: 'Esta publicación no está disponible' }),
    ).toBeInTheDocument();
    expect(getOfflineProperty('15')).toBeNull();
  });

  it('en el catálogo sin conexión lista las fichas disponibles', async () => {
    saveOfflineProperty(PROPERTY, {}, Date.now());
    online = false;
    api.getPublicProperties.mockRejectedValue(networkError());
    renderAt('/catalogo');

    expect(await screen.findByText('El catálogo requiere conexión')).toBeInTheDocument();
    const list = screen.getByRole('region', { name: 'Disponibles sin conexión' });
    expect(within(list).getByRole('link', { name: new RegExp(PROPERTY.title) })).toHaveAttribute(
      'href',
      '/propiedades/15',
    );
  });

  it('con conexión no muestra el aviso global ni la lista sin conexión', async () => {
    saveOfflineProperty(PROPERTY, {}, Date.now());
    api.getPublicProperties.mockRejectedValue(Object.assign(new Error('Error'), { status: 500 }));
    renderAt('/catalogo');

    await screen.findByText('No pudimos cargar el catálogo');
    expect(screen.queryByText(/Sin conexión\./)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Disponibles sin conexión' }),
    ).not.toBeInTheDocument();
  });
});

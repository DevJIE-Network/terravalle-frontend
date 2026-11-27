import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api';
import { AuthProvider } from '@/context/AuthProvider';
import { FavoritesProvider } from '@/context/FavoritesProvider';
import PublicPropertyPage from '@/pages/PublicProperty/PublicPropertyPage';
import { ROUTES, STORAGE_KEYS } from '@/utils/constants';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getPublicProperty: vi.fn(),
  getPropertyContact: vi.fn(),
  favoriteService: {
    listFavorites: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
  },
}));

function buildProperty(overrides = {}) {
  return {
    id: '15',
    title: 'Casa con alberca en Marina Vallarta',
    description: 'Casa de dos plantas a unos pasos del malecón.',
    propertyType: { id: 2, name: 'Casa' },
    publicationPrice: 6850000,
    publishedAt: '2026-10-01T12:00:00.000Z',
    photos: [
      { id: 1, imageUrl: 'https://img.test/1.jpg', isPrimary: false },
      { id: 2, imageUrl: 'https://img.test/2.jpg', isPrimary: true },
    ],
    dimensions: { landArea: 320, frontage: 12, depth: 26.5 },
    hasConstruction: true,
    construction: {
      builtArea: 240,
      floors: 2,
      bedrooms: 3,
      bathrooms: 2.5,
      parkingSpaces: 2,
      constructionAge: 0,
      generalCondition: 'excellent',
      constructionQuality: 'high',
    },
    services: [{ id: 1, name: 'Agua potable', description: 'Red municipal' }],
    location: {
      street: 'Paseo de la Marina',
      exteriorNumber: '245',
      neighborhood: 'Marina Vallarta',
      municipality: 'Puerto Vallarta',
      state: 'Jalisco',
      postalCode: '48335',
      country: 'México',
      latitude: 20.6612,
      longitude: -105.2531,
    },
    nearbyPlaces: [
      {
        id: 1,
        name: 'Plaza Marina',
        category: { id: 1, name: 'Comercio' },
        approximateDistanceM: 350,
      },
      {
        id: 2,
        name: 'Aeropuerto PVR',
        category: { id: 2, name: 'Transporte' },
        approximateDistanceM: 2400,
      },
    ],
    estimate: {
      estimatedMin: 6200000,
      estimatedValue: 6600000,
      estimatedMax: 7000000,
      generatedAt: '2026-10-05T12:00:00.000Z',
    },
    ...overrides,
  };
}

function renderDetail({ id = '15', session = false, catalogSearch } = {}) {
  if (session) {
    localStorage.setItem(
      STORAGE_KEYS.SESSION,
      JSON.stringify({ token: 'token-de-prueba', user: { name: 'Laura Gómez' } }),
    );
  }
  const router = createMemoryRouter(
    [
      {
        element: (
          <AuthProvider>
            <FavoritesProvider>
              <Outlet />
            </FavoritesProvider>
          </AuthProvider>
        ),
        children: [
          { path: ROUTES.PUBLIC_PROPERTY, element: <PublicPropertyPage /> },
          { path: ROUTES.CATALOG, element: <h1>Catálogo</h1> },
          { path: ROUTES.LOGIN, element: <h1>Iniciar sesión</h1> },
        ],
      },
    ],
    {
      initialEntries: [
        { pathname: `/propiedades/${id}`, state: catalogSearch ? { catalogSearch } : null },
      ],
    },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function unavailable(status) {
  return Object.assign(new Error('No disponible'), { status });
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Ficha pública de una propiedad', () => {
  it('muestra galería, precio del vendedor y todas las secciones con datos', async () => {
    api.getPublicProperty.mockResolvedValue({ property: buildProperty(), notes: {} });
    renderDetail();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Casa con alberca en Marina Vallarta' }),
    ).toBeInTheDocument();
    expect(api.getPublicProperty).toHaveBeenCalledWith('15');
    expect(screen.getByText(/6,850,000/)).toBeInTheDocument();

    const gallery = screen.getByRole('region', { name: 'Galería de fotografías' });
    // La foto principal va primero aunque no venga primero en la respuesta.
    expect(within(gallery).getAllByRole('img')[0]).toHaveAttribute('src', 'https://img.test/2.jpg');
    expect(within(gallery).getByRole('button', { name: 'Foto siguiente' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Descripción' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Características' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Servicios disponibles' })).toBeInTheDocument();
    expect(screen.getByText('Agua potable')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ubicación y alrededores' })).toBeInTheDocument();
    expect(screen.getByTitle(/Mapa de la ubicación/)).toHaveAttribute(
      'src',
      expect.stringContaining('openstreetmap.org'),
    );
    expect(screen.getByText('Plaza Marina')).toBeInTheDocument();
    expect(screen.getByText(/350 m/)).toBeInTheDocument();
    expect(screen.getByText(/2\.4 km/)).toBeInTheDocument();
  });

  it('separa la estimación con IA y la etiqueta como orientativa', async () => {
    api.getPublicProperty.mockResolvedValue({ property: buildProperty(), notes: {} });
    renderDetail();

    const estimate = await screen.findByRole('complementary', {
      name: 'Estimación orientativa con IA',
    });
    expect(within(estimate).getByText('Orientativa')).toBeInTheDocument();
    expect(within(estimate).getByText(/6,200,000/)).toBeInTheDocument();
    expect(within(estimate).getByText(/No es el precio de venta/)).toBeInTheDocument();
    expect(within(estimate).queryByText(/6,850,000/)).not.toBeInTheDocument();
  });

  it('oculta las secciones vacías', async () => {
    api.getPublicProperty.mockResolvedValue({
      property: buildProperty({
        description: '',
        dimensions: null,
        hasConstruction: false,
        construction: null,
        services: [],
        location: null,
        nearbyPlaces: [],
        estimate: null,
        photos: [],
      }),
      notes: {},
    });
    renderDetail();

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('heading', { name: 'Descripción' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Servicios disponibles' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Ubicación y alrededores' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Orientativa')).not.toBeInTheDocument();
    expect(screen.getByText('Esta propiedad aún no tiene fotografías.')).toBeInTheDocument();
  });

  it.each([404, 410])('con %i muestra el aviso y vuelve al catálogo', async (status) => {
    const user = userEvent.setup();
    api.getPublicProperty.mockRejectedValue(unavailable(status));
    renderDetail({ id: '999' });

    expect(
      await screen.findByRole('heading', { name: 'Esta publicación no está disponible' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Volver al catálogo' }));
    expect(await screen.findByRole('heading', { name: 'Catálogo' })).toBeInTheDocument();
  });

  it('ofrece reintentar ante otros errores', async () => {
    const user = userEvent.setup();
    api.getPublicProperty
      .mockRejectedValueOnce(Object.assign(new Error('Falla de red'), { status: 0 }))
      .mockResolvedValueOnce({ property: buildProperty(), notes: {} });
    renderDetail();

    await user.click(await screen.findByRole('button', { name: /reintentar/i }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Marina Vallarta');
  });

  it('revela el contacto del vendedor como enlace de WhatsApp', async () => {
    const user = userEvent.setup();
    api.getPublicProperty.mockResolvedValue({ property: buildProperty(), notes: {} });
    api.getPropertyContact.mockResolvedValue({ type: 'whatsapp', value: '3221234567' });
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Contactar vendedor' }));
    const link = await screen.findByRole('link', { name: '3221234567' });
    expect(link.getAttribute('href')).toContain('wa.me/523221234567');
    expect(api.getPropertyContact).toHaveBeenCalledWith('15');
  });

  it('avisa cuando el vendedor no tiene medio de contacto', async () => {
    const user = userEvent.setup();
    api.getPublicProperty.mockResolvedValue({ property: buildProperty(), notes: {} });
    api.getPropertyContact.mockRejectedValue(unavailable(404));
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Contactar vendedor' }));
    expect(await screen.findByText(/no tiene un medio de contacto/)).toBeInTheDocument();
  });

  it.each(['inactive', 'withdrawn'])(
    'con estado %s no ofrece contacto, no consulta HU-013 y la ficha sigue funcionando',
    async (status) => {
      api.getPublicProperty.mockResolvedValue({
        property: buildProperty({ status }),
        notes: {},
      });
      renderDetail();

      expect(
        await screen.findByText(
          'El contacto con el vendedor no está disponible para esta propiedad.',
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Contactar vendedor' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /tel:|mailto:/ })).not.toBeInTheDocument();
      expect(api.getPropertyContact).not.toHaveBeenCalled();
      expect(
        await screen.findByRole('heading', { level: 1, name: /Casa con alberca/ }),
      ).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Descripción' })).toBeInTheDocument();
    },
  );

  it('sin sesión invita a iniciar sesión para guardar', async () => {
    api.getPublicProperty.mockResolvedValue({ property: buildProperty(), notes: {} });
    renderDetail();

    const link = await screen.findByRole('link', { name: /Inicia sesión para guardar/ });
    expect(link).toHaveAttribute('href', ROUTES.LOGIN);
    expect(api.favoriteService.listFavorites).not.toHaveBeenCalled();
  });

  it('con sesión guarda y quita la propiedad de favoritos', async () => {
    const user = userEvent.setup();
    api.getPublicProperty.mockResolvedValue({ property: buildProperty(), notes: {} });
    api.favoriteService.listFavorites.mockResolvedValue([{ id: '1', propertyId: '99' }]);
    api.favoriteService.addFavorite.mockResolvedValue({});
    api.favoriteService.removeFavorite.mockResolvedValue({});
    renderDetail({ session: true });

    const button = await screen.findByRole('button', { name: /Guardar en favoritos/ });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);
    expect(api.favoriteService.addFavorite).toHaveBeenCalledWith('15');
    const saved = await screen.findByRole('button', { name: /Guardada en favoritos/ });
    expect(saved).toHaveAttribute('aria-pressed', 'true');

    await user.click(saved);
    expect(api.favoriteService.removeFavorite).toHaveBeenCalledWith('15');
    expect(await screen.findByRole('button', { name: /Guardar en favoritos/ })).toBeEnabled();
  });

  it('marca como guardada una propiedad que ya está en favoritos', async () => {
    api.getPublicProperty.mockResolvedValue({ property: buildProperty(), notes: {} });
    api.favoriteService.listFavorites.mockResolvedValue([{ id: '1', propertyId: '15' }]);
    renderDetail({ session: true });

    expect(await screen.findByRole('button', { name: /Guardada en favoritos/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('vuelve al catálogo con la misma búsqueda desde la que se abrió', async () => {
    api.getPublicProperty.mockResolvedValue({ property: buildProperty(), notes: {} });
    renderDetail({ catalogSearch: '?q=casa&maxPrice=900000' });

    expect(await screen.findByRole('link', { name: /Volver al catálogo/ })).toHaveAttribute(
      'href',
      `${ROUTES.CATALOG}?q=casa&maxPrice=900000`,
    );
  });
});

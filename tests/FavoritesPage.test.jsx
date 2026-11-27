import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api';
import { AuthProvider } from '@/context/AuthProvider';
import { FavoritesProvider } from '@/context/FavoritesProvider';
import FavoritesPage from '@/pages/Favorites/FavoritesPage';
import { ROUTES, STORAGE_KEYS } from '@/utils/constants';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  favoriteService: {
    listFavorites: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
  },
}));

const ACTIVE = {
  id: 1,
  propertyId: 9,
  title: 'Casa con jardín en Tula',
  status: 'active',
  propertyType: { id: 2, name: 'Casa' },
  publicationPrice: '1500000.00',
  location: { municipality: 'Tula de Allende', state: 'Hidalgo' },
};
const INACTIVE = {
  id: 2,
  propertyId: 4,
  title: 'Terreno junto al valle',
  status: 'inactive',
  propertyType: { id: 1, name: 'Terreno' },
  publicationPrice: 500000,
  location: { municipality: 'Tepeji del Río', state: 'Hidalgo' },
};
const WITHDRAWN = {
  ...INACTIVE,
  id: 3,
  propertyId: 5,
  title: 'Lote retirado',
  status: 'withdrawn',
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderPage() {
  localStorage.setItem(
    STORAGE_KEYS.SESSION,
    JSON.stringify({ token: 'token-de-prueba', user: { name: 'Laura Gómez' } }),
  );
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
          { path: ROUTES.FAVORITES, element: <FavoritesPage /> },
          { path: ROUTES.CATALOG, element: <h1>Catálogo</h1> },
        ],
      },
    ],
    { initialEntries: [ROUTES.FAVORITES] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const card = (title) => screen.getByRole('article', { name: title });

describe('HU-030 · pantalla Mis favoritos', () => {
  beforeEach(() => {
    api.favoriteService.listFavorites.mockResolvedValue([ACTIVE]);
    api.favoriteService.addFavorite.mockResolvedValue({});
    api.favoriteService.removeFavorite.mockResolvedValue({});
  });

  it('muestra las propiedades guardadas con su información y enlace a la ficha (CA3)', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Mis favoritos' })).toBeVisible();
    const house = await screen.findByRole('article', { name: ACTIVE.title });
    expect(within(house).getByText('Casa')).toBeInTheDocument();
    expect(within(house).getByText('Tula de Allende, Hidalgo')).toBeInTheDocument();
    expect(within(house).getByText(/1,500,000/)).toBeInTheDocument();
    expect(within(house).queryByText('No disponible')).not.toBeInTheDocument();
    expect(
      within(house).getByRole('link', { name: `Ver propiedad: ${ACTIVE.title}` }),
    ).toHaveAttribute('href', '/propiedades/9');
  });

  it('las propiedades que dejaron de estar disponibles se indican, sin enlace, y se pueden quitar', async () => {
    api.favoriteService.listFavorites.mockResolvedValue([ACTIVE, INACTIVE, WITHDRAWN]);
    renderPage();

    const inactive = await screen.findByRole('article', { name: INACTIVE.title });
    expect(within(inactive).getByText('No disponible')).toBeInTheDocument();
    expect(within(inactive).getByText(/El vendedor la desactivó/)).toBeInTheDocument();
    expect(within(inactive).queryByRole('link')).not.toBeInTheDocument();
    expect(within(inactive).getByRole('button', { name: /Quitar de favoritos/ })).toBeEnabled();

    const withdrawn = screen.getByRole('article', { name: WITHDRAWN.title });
    expect(within(withdrawn).getByText(/lo retiró|la retiró/)).toBeInTheDocument();

    expect(screen.getByText(/2 de tus favoritos ya no están disponibles/)).toBeInTheDocument();
    // La activa sigue sin marca.
    expect(within(card(ACTIVE.title)).queryByText('No disponible')).not.toBeInTheDocument();
  });

  it('quitar una propiedad la retira de la lista y ofrece deshacer (CA4)', async () => {
    const user = userEvent.setup();
    renderPage();

    const house = await screen.findByRole('article', { name: ACTIVE.title });
    await user.click(within(house).getByRole('button', { name: /Quitar de favoritos/ }));

    expect(api.favoriteService.removeFavorite).toHaveBeenCalledExactlyOnceWith('9');
    await waitFor(() =>
      expect(screen.queryByRole('article', { name: ACTIVE.title })).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByText(`Quitaste «${ACTIVE.title}» de tus favoritos.`),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeEnabled();
    // Solo se quitó el favorito: no hay ninguna otra llamada que toque la publicación.
    expect(api.favoriteService.addFavorite).not.toHaveBeenCalled();
    expect(screen.getByText('Aún no tienes favoritos')).toBeInTheDocument();
  });

  it('deshacer vuelve a guardarla y la pone otra vez en su lugar', async () => {
    const user = userEvent.setup();
    api.favoriteService.listFavorites.mockResolvedValue([ACTIVE, INACTIVE]);
    renderPage();

    await user.click(
      within(await screen.findByRole('article', { name: ACTIVE.title })).getByRole('button', {
        name: /Quitar de favoritos/,
      }),
    );
    await user.click(await screen.findByRole('button', { name: 'Deshacer' }));

    expect(api.favoriteService.addFavorite).toHaveBeenCalledExactlyOnceWith(9);
    const items = await screen.findAllByRole('article');
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual([
      ACTIVE.title,
      INACTIVE.title,
    ]);
    expect(screen.queryByText(/Quitaste/)).not.toBeInTheDocument();
  });

  it('si deshacer falla, el aviso se queda con un mensaje y se puede reintentar', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      within(await screen.findByRole('article', { name: ACTIVE.title })).getByRole('button', {
        name: /Quitar de favoritos/,
      }),
    );
    api.favoriteService.addFavorite.mockRejectedValueOnce(new Error('Sin conexión.'));
    await user.click(await screen.findByRole('button', { name: 'Deshacer' }));

    expect(await screen.findByText(/No pudimos restaurarla/)).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: ACTIVE.title })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(await screen.findByRole('article', { name: ACTIVE.title })).toBeInTheDocument();
    expect(api.favoriteService.addFavorite).toHaveBeenCalledTimes(2);
  });

  it('el aviso de deshacer se puede cerrar', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      within(await screen.findByRole('article', { name: ACTIVE.title })).getByRole('button', {
        name: /Quitar de favoritos/,
      }),
    );
    await screen.findByText(/Quitaste/);
    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }));

    expect(screen.queryByText(/Quitaste/)).not.toBeInTheDocument();
  });

  it('si quitarla falla, la propiedad regresa a la lista con un aviso y no hay opción de deshacer', async () => {
    const user = userEvent.setup();
    api.favoriteService.removeFavorite.mockRejectedValue(new Error('El servidor falló.'));
    renderPage();

    await user.click(
      within(await screen.findByRole('article', { name: ACTIVE.title })).getByRole('button', {
        name: /Quitar de favoritos/,
      }),
    );

    const house = await screen.findByRole('article', { name: ACTIVE.title });
    expect(await within(house).findByRole('alert')).toHaveTextContent('El servidor falló.');
    expect(screen.queryByRole('button', { name: 'Deshacer' })).not.toBeInTheDocument();
  });

  it('quitar varias deja un aviso por cada una y cada una se deshace por separado', async () => {
    const user = userEvent.setup();
    api.favoriteService.listFavorites.mockResolvedValue([ACTIVE, INACTIVE]);
    renderPage();

    await user.click(
      within(await screen.findByRole('article', { name: ACTIVE.title })).getByRole('button', {
        name: /Quitar de favoritos/,
      }),
    );
    await user.click(
      within(await screen.findByRole('article', { name: INACTIVE.title })).getByRole('button', {
        name: /Quitar de favoritos/,
      }),
    );

    expect(await screen.findAllByRole('button', { name: 'Deshacer' })).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: 'Deshacer' })[0]);

    expect(await screen.findByRole('article', { name: ACTIVE.title })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: INACTIVE.title })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Deshacer' })).toHaveLength(1);
  });

  it('muestra un marcador de carga mientras llega la lista', async () => {
    const pending = deferred();
    api.favoriteService.listFavorites.mockReturnValue(pending.promise);
    renderPage();

    expect(await screen.findAllByTestId('property-card-skeleton')).toHaveLength(3);
    await act(async () => pending.resolve([ACTIVE]));
    expect(await screen.findByRole('article', { name: ACTIVE.title })).toBeInTheDocument();
    expect(screen.queryByTestId('property-card-skeleton')).not.toBeInTheDocument();
  });

  it('sin favoritos explica cómo guardarlos y lleva al catálogo', async () => {
    const user = userEvent.setup();
    api.favoriteService.listFavorites.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Aún no tienes favoritos')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Explorar el catálogo' }));
    expect(await screen.findByRole('heading', { name: 'Catálogo' })).toBeInTheDocument();
  });

  it('si la lista no carga muestra el error y reintenta', async () => {
    const user = userEvent.setup();
    api.favoriteService.listFavorites
      .mockRejectedValueOnce(new Error('No hay conexión con el servidor.'))
      .mockResolvedValueOnce([ACTIVE]);
    renderPage();

    expect(await screen.findByText('No pudimos cargar tus favoritos')).toBeInTheDocument();
    expect(screen.getByText('No hay conexión con el servidor.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('article', { name: ACTIVE.title })).toBeInTheDocument();
    expect(api.favoriteService.listFavorites).toHaveBeenCalledTimes(2);
  });

  it('anuncia la cantidad de propiedades guardadas a los lectores de pantalla', async () => {
    api.favoriteService.listFavorites.mockResolvedValue([ACTIVE, INACTIVE]);
    renderPage();

    await screen.findByRole('article', { name: ACTIVE.title });
    expect(screen.getByText('2 propiedades guardadas.')).toHaveAttribute('role', 'status');
  });
});

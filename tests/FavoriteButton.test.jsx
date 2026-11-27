import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api';
import { FavoriteButton, PublicPropertyCard } from '@/components/property';
import { AuthProvider } from '@/context/AuthProvider';
import { FavoritesProvider } from '@/context/FavoritesProvider';
import { useAuth } from '@/hooks';
import { ROUTES, STORAGE_KEYS } from '@/utils/constants';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  favoriteService: {
    listFavorites: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
  },
}));

const HOUSE = {
  id: 9,
  title: 'Casa con jardín en Tula',
  propertyType: { id: 2, name: 'Casa' },
  publicationPrice: 1500000,
  location: { municipality: 'Tula de Allende', state: 'Hidalgo' },
  landArea: 200,
};
const LAND = { ...HOUSE, id: 2, title: 'Terreno en Tepeji' };

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function LoginProbe() {
  const location = useLocation();
  return <h1>Iniciar sesión · vuelve a {location.state?.from?.pathname}</h1>;
}

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button type="button" onClick={logout}>
      Salir
    </button>
  );
}

function renderWith(children, { session = false, path = '/pagina' } = {}) {
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
          { path: '/pagina', element: children },
          { path: ROUTES.LOGIN, element: <LoginProbe /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('HU-030 · ícono de favorito', () => {
  beforeEach(() => {
    api.favoriteService.listFavorites.mockResolvedValue([]);
    api.favoriteService.addFavorite.mockResolvedValue({});
    api.favoriteService.removeFavorite.mockResolvedValue({});
  });

  it('un visitante ve una invitación a iniciar sesión y no se consulta ninguna lista', async () => {
    const user = userEvent.setup();
    renderWith(<PublicPropertyCard property={HOUSE} />);

    const invite = screen.getByRole('link', {
      name: `Inicia sesión para guardar en favoritos: ${HOUSE.title}`,
    });
    expect(invite).toHaveAttribute('href', ROUTES.LOGIN);
    expect(api.favoriteService.listFavorites).not.toHaveBeenCalled();

    await user.click(invite);
    expect(await screen.findByRole('heading', { name: /vuelve a \/pagina/ })).toBeInTheDocument();
    expect(api.favoriteService.addFavorite).not.toHaveBeenCalled();
  });

  it('con sesión, presionar el ícono guarda la propiedad y la muestra marcada (CA1)', async () => {
    const user = userEvent.setup();
    renderWith(<PublicPropertyCard property={HOUSE} />, { session: true });

    const heart = await screen.findByRole('button', {
      name: `Guardar en favoritos: ${HOUSE.title}`,
    });
    await waitFor(() => expect(heart).toBeEnabled());
    expect(heart).toHaveAttribute('aria-pressed', 'false');

    await user.click(heart);

    expect(api.favoriteService.addFavorite).toHaveBeenCalledExactlyOnceWith(9);
    expect(heart).toHaveAttribute('aria-pressed', 'true');
  });

  it('responde de inmediato: el ícono queda marcado antes de que el backend conteste', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    api.favoriteService.addFavorite.mockReturnValue(pending.promise);
    renderWith(<PublicPropertyCard property={HOUSE} />, { session: true });

    const heart = await screen.findByRole('button', { name: /Guardar en favoritos/ });
    await waitFor(() => expect(heart).toBeEnabled());
    await user.click(heart);

    expect(heart).toHaveAttribute('aria-pressed', 'true');
    expect(heart).toHaveAttribute('aria-busy', 'true');

    await act(async () => pending.resolve({}));
    expect(heart).not.toHaveAttribute('aria-busy');
    expect(heart).toHaveAttribute('aria-pressed', 'true');
  });

  it('si el backend falla, el ícono regresa a su estado anterior y se avisa', async () => {
    const user = userEvent.setup();
    api.favoriteService.addFavorite.mockRejectedValue(
      Object.assign(new Error('No hay conexión con el servidor.'), { status: null }),
    );
    renderWith(<PublicPropertyCard property={HOUSE} />, { session: true });

    const heart = await screen.findByRole('button', { name: /Guardar en favoritos/ });
    await waitFor(() => expect(heart).toBeEnabled());
    await user.click(heart);

    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión con el servidor.');
    expect(heart).toHaveAttribute('aria-pressed', 'false');
  });

  it('si la propiedad ya no existe al guardarla, explica que no está disponible', async () => {
    const user = userEvent.setup();
    api.favoriteService.addFavorite.mockRejectedValue(
      Object.assign(new Error('No encontramos lo que buscabas.'), { status: 404 }),
    );
    renderWith(<PublicPropertyCard property={HOUSE} />, { session: true });

    const heart = await screen.findByRole('button', { name: /Guardar en favoritos/ });
    await waitFor(() => expect(heart).toBeEnabled());
    await user.click(heart);

    expect(await screen.findByRole('alert')).toHaveTextContent(/ya no está disponible/);
    expect(heart).toHaveAttribute('aria-pressed', 'false');
  });

  it('una propiedad ya guardada aparece marcada y presionarla la quita, sin volver a guardarla (CA2)', async () => {
    const user = userEvent.setup();
    api.favoriteService.listFavorites.mockResolvedValue([{ id: 1, propertyId: '9' }]);
    renderWith(<PublicPropertyCard property={HOUSE} />, { session: true });

    const heart = await screen.findByRole('button', { name: /Guardar en favoritos/ });
    await waitFor(() => expect(heart).toHaveAttribute('aria-pressed', 'true'));

    await user.click(heart);
    expect(api.favoriteService.addFavorite).not.toHaveBeenCalled();
    expect(api.favoriteService.removeFavorite).toHaveBeenCalledExactlyOnceWith(9);
    expect(heart).toHaveAttribute('aria-pressed', 'false');
  });

  it('si quitarla falla, vuelve a mostrarse marcada', async () => {
    const user = userEvent.setup();
    api.favoriteService.listFavorites.mockResolvedValue([{ id: 1, propertyId: 9 }]);
    api.favoriteService.removeFavorite.mockRejectedValue(new Error('El servidor falló.'));
    renderWith(<PublicPropertyCard property={HOUSE} />, { session: true });

    const heart = await screen.findByRole('button', { name: /Guardar en favoritos/ });
    await waitFor(() => expect(heart).toHaveAttribute('aria-pressed', 'true'));
    await user.click(heart);

    expect(await screen.findByRole('alert')).toHaveTextContent('El servidor falló.');
    expect(heart).toHaveAttribute('aria-pressed', 'true');
  });

  it('ignora clics repetidos mientras la petición sigue en curso', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    api.favoriteService.addFavorite.mockReturnValue(pending.promise);
    renderWith(<PublicPropertyCard property={HOUSE} />, { session: true });

    const heart = await screen.findByRole('button', { name: /Guardar en favoritos/ });
    await waitFor(() => expect(heart).toBeEnabled());
    await user.click(heart);
    await user.click(heart);
    await user.click(heart);

    expect(api.favoriteService.addFavorite).toHaveBeenCalledTimes(1);
    expect(api.favoriteService.removeFavorite).not.toHaveBeenCalled();
    await act(async () => pending.resolve({}));
  });

  it('el estado se comparte: marcar una propiedad actualiza todos sus íconos, y las otras no cambian', async () => {
    const user = userEvent.setup();
    renderWith(
      <>
        <PublicPropertyCard property={HOUSE} />
        <FavoriteButton variant="full" propertyId={9} title={HOUSE.title} />
        <PublicPropertyCard property={LAND} />
      </>,
      { session: true },
    );

    const full = await screen.findByRole('button', { name: /Guardar en favoritos$/ });
    await waitFor(() => expect(full).toBeEnabled());
    await user.click(full);

    expect(await screen.findByRole('button', { name: 'Guardada en favoritos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const cardHeart = screen.getByRole('button', { name: `Guardar en favoritos: ${HOUSE.title}` });
    const otherHeart = screen.getByRole('button', { name: `Guardar en favoritos: ${LAND.title}` });
    expect(cardHeart).toHaveAttribute('aria-pressed', 'true');
    expect(otherHeart).toHaveAttribute('aria-pressed', 'false');
    expect(api.favoriteService.listFavorites).toHaveBeenCalledTimes(1);
  });

  it('el ícono va fuera del enlace de la tarjeta: no hay controles anidados', async () => {
    renderWith(<PublicPropertyCard property={HOUSE} />, { session: true });

    const heart = await screen.findByRole('button', { name: /Guardar en favoritos/ });
    const cardLink = screen.getByRole('link', { name: `Ver propiedad: ${HOUSE.title}` });
    expect(within(cardLink).queryByRole('button')).not.toBeInTheDocument();
    expect(cardLink.contains(heart)).toBe(false);
  });

  it('mientras se consulta la lista por primera vez el ícono espera, y luego queda utilizable', async () => {
    const pending = deferred();
    api.favoriteService.listFavorites.mockReturnValue(pending.promise);
    renderWith(<PublicPropertyCard property={HOUSE} />, { session: true });

    const heart = await screen.findByRole('button', { name: /Guardar en favoritos/ });
    expect(heart).toBeDisabled();

    await act(async () => pending.resolve([{ id: 1, propertyId: 9 }]));
    expect(heart).toBeEnabled();
    expect(heart).toHaveAttribute('aria-pressed', 'true');
  });

  it('si la lista no carga, se puede seguir guardando (guardar es idempotente en el backend)', async () => {
    const user = userEvent.setup();
    api.favoriteService.listFavorites.mockRejectedValue(new Error('sin red'));
    renderWith(<PublicPropertyCard property={HOUSE} />, { session: true });

    const heart = await screen.findByRole('button', { name: /Guardar en favoritos/ });
    await waitFor(() => expect(heart).toBeEnabled());
    await user.click(heart);

    expect(api.favoriteService.addFavorite).toHaveBeenCalledWith(9);
  });

  it('al cerrar sesión se descartan los favoritos y el ícono pasa a invitar a iniciar sesión', async () => {
    const user = userEvent.setup();
    api.favoriteService.listFavorites.mockResolvedValue([{ id: 1, propertyId: 9 }]);
    renderWith(
      <>
        <PublicPropertyCard property={HOUSE} />
        <LogoutButton />
      </>,
      { session: true },
    );

    const heart = await screen.findByRole('button', { name: /Guardar en favoritos/ });
    await waitFor(() => expect(heart).toHaveAttribute('aria-pressed', 'true'));

    await user.click(screen.getByRole('button', { name: 'Salir' }));

    expect(
      await screen.findByRole('link', { name: /Inicia sesión para guardar en favoritos/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Guardar en favoritos/ })).not.toBeInTheDocument();
  });

  it('sin FavoritesProvider no muestra nada (el catálogo funciona sin él)', () => {
    const router = createMemoryRouter([
      { path: '/', element: <FavoriteButton propertyId={1} title="Casa" /> },
    ]);
    const { container } = render(<RouterProvider router={router} />);

    expect(container).toBeEmptyDOMElement();
  });
});

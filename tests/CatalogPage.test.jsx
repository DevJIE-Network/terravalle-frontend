import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api';
import CatalogPage from '@/pages/Catalog/CatalogPage';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getPublicProperties: vi.fn(),
}));

const HOUSE = {
  id: 9,
  title: 'Casa con jardín en Tula',
  propertyType: { id: 2, name: 'Casa' },
  publicationPrice: '1500000.00',
  location: { municipality: 'Tula de Allende', state: 'Hidalgo' },
  landArea: '200.00',
  hasConstruction: true,
  builtArea: 120,
  primaryPhoto: { url: 'https://img.test/casa-principal.jpg' },
};
const LAND = {
  id: 2,
  title: 'Terreno en Tepeji',
  propertyType: { id: 1, name: 'Terreno' },
  publicationPrice: 500000,
  location: { municipality: 'Tepeji del Río', state: 'Hidalgo' },
  landArea: 300,
  hasConstruction: false,
  builtArea: null,
  primaryPhoto: null,
};
const NEXT = { ...LAND, id: 7, title: 'Terreno junto al valle' };
const LAST = { ...HOUSE, id: 1, title: 'Casa al final del camino' };

function result(properties, { page = 1, hasNextPage = false, total = properties.length } = {}) {
  return {
    properties,
    pagination: {
      page,
      limit: 12,
      total,
      totalPages: hasNextPage ? page + 1 : page,
      hasNextPage,
      hasPreviousPage: page > 1,
    },
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CatalogPage />
    </MemoryRouter>,
  );
}

const card = (title) => screen.getByRole('article', { name: title });
const titles = () =>
  screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);

beforeEach(() => {
  api.getPublicProperties.mockReset().mockResolvedValue(result([HOUSE, LAND]));
});

describe('HU-026 · catálogo público', () => {
  it('consulta page=1 y renderiza foto, tipo, ubicación, precio MXN y superficie sin AuthProvider', async () => {
    renderPage();
    await screen.findByRole('article', { name: HOUSE.title });

    expect(api.getPublicProperties).toHaveBeenCalledExactlyOnceWith({ page: 1, limit: 12 });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Propiedades disponibles');
    expect(titles()).toEqual([HOUSE.title, LAND.title]);
    const house = within(card(HOUSE.title));
    expect(
      house.getByRole('img', { name: `Fotografía principal de ${HOUSE.title}` }),
    ).toHaveAttribute('src', HOUSE.primaryPhoto.url);
    expect(house.getByRole('img')).toHaveAttribute('loading', 'lazy');
    expect(house.getByText('Casa')).toBeInTheDocument();
    expect(house.getByText('Tula de Allende, Hidalgo')).toBeInTheDocument();
    expect(house.getByText('$1,500,000 MXN')).toBeInTheDocument();
    expect(house.getByText('200 m²')).toBeInTheDocument();
    expect(house.getByText('120 m² construidos')).toBeInTheDocument();
    expect(within(card(LAND.title)).getByText('Terreno')).toBeInTheDocument();
    expect(screen.queryByText('null')).not.toBeInTheDocument();
  });

  it('sin foto muestra un placeholder, nunca una imagen con src vacío', async () => {
    renderPage();
    await screen.findByRole('article', { name: LAND.title });
    expect(within(card(LAND.title)).getByText('Fotografía no disponible')).toBeInTheDocument();
    expect(within(card(LAND.title)).queryByRole('img')).not.toBeInTheDocument();
  });

  it('sustituye una imagen fallida por el mismo placeholder', async () => {
    renderPage();
    await screen.findByRole('article', { name: HOUSE.title });
    fireEvent.error(within(card(HOUSE.title)).getByRole('img'));
    expect(within(card(HOUSE.title)).queryByRole('img')).not.toBeInTheDocument();
    expect(within(card(HOUSE.title)).getByText('Fotografía no disponible')).toBeInTheDocument();
  });

  it('tolera los campos opcionales ausentes sin inventar precio, ubicación o superficie', async () => {
    api.getPublicProperties.mockResolvedValue(result([{ id: 5, title: 'Nueva publicación' }]));
    renderPage();
    await screen.findByRole('article');
    expect(screen.getByText('Precio por consultar')).toBeInTheDocument();
    expect(screen.getByText('Ubicación no disponible')).toBeInTheDocument();
    expect(screen.getByText('Superficie no disponible')).toBeInTheDocument();
    expect(screen.queryByText(/construidos/)).not.toBeInTheDocument();
  });

  it('mantiene skeleton cards durante la carga inicial, ocultos al lector de pantalla', async () => {
    const pending = deferred();
    api.getPublicProperties.mockReturnValue(pending.promise);
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando propiedades...');
    expect(screen.getAllByTestId('property-card-skeleton')).toHaveLength(6);
    for (const skeleton of screen.getAllByTestId('property-card-skeleton')) {
      expect(skeleton.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    await act(async () => pending.resolve(result([HOUSE])));
    expect(screen.queryByTestId('property-card-skeleton')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 propiedades cargadas.');
  });

  it('muestra el estado vacío sin botón de carga adicional', async () => {
    api.getPublicProperties.mockResolvedValue(result([]));
    renderPage();
    expect(
      await screen.findByText('No hay propiedades disponibles en este momento.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cargar más propiedades' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('muestra error inicial amigable y Reintentar vuelve a pedir la primera página', async () => {
    const user = userEvent.setup();
    api.getPublicProperties.mockRejectedValueOnce(new Error('Network Error técnico'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el catálogo');
    expect(screen.queryByText('Network Error técnico')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByRole('article', { name: HOUSE.title });
    expect(api.getPublicProperties).toHaveBeenNthCalledWith(2, { page: 1, limit: 12 });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('descarta duplicados también en la primera página', async () => {
    api.getPublicProperties.mockResolvedValue(result([HOUSE, HOUSE, LAND]));
    renderPage();
    await screen.findAllByRole('article');
    expect(titles()).toEqual([HOUSE.title, LAND.title]);
  });
});

describe('HU-026 · paginación incremental', () => {
  it('agrega la siguiente página sin desmontar tarjetas, cambiar el orden, repetir IDs ni desplazar la vista', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    api.getPublicProperties
      .mockResolvedValueOnce(result([HOUSE, LAND], { hasNextPage: true, total: 4 }))
      .mockReturnValueOnce(pending.promise);
    renderPage();
    await screen.findByRole('article', { name: HOUSE.title });
    const originalCard = card(HOUSE.title);

    await user.dblClick(screen.getByRole('button', { name: 'Cargar más propiedades' }));
    expect(api.getPublicProperties).toHaveBeenCalledTimes(2);
    expect(api.getPublicProperties).toHaveBeenLastCalledWith({ page: 2, limit: 12 });
    expect(screen.getByRole('button', { name: 'Cargando más propiedades...' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando más propiedades...');
    expect(screen.queryByTestId('property-card-skeleton')).not.toBeInTheDocument();
    expect(titles()).toEqual([HOUSE.title, LAND.title]);

    await act(async () =>
      pending.resolve(
        result([{ ...LAND, id: '2', title: 'Duplicada de otra página' }, NEXT, NEXT, LAST], {
          page: 2,
          total: 4,
        }),
      ),
    );

    expect(titles()).toEqual([HOUSE.title, LAND.title, NEXT.title, LAST.title]);
    expect(card(HOUSE.title)).toBe(originalCard);
    expect(screen.queryByText('Duplicada de otra página')).not.toBeInTheDocument();
    expect(scroll).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Cargar más propiedades' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Has visto todas las propiedades disponibles.')).toBeInTheDocument();
  });

  it('un error de segunda página conserva resultados y reintenta esa misma página', async () => {
    const user = userEvent.setup();
    const retryRequest = deferred();
    api.getPublicProperties
      .mockResolvedValueOnce(result([HOUSE, LAND], { hasNextPage: true, total: 3 }))
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockReturnValueOnce(retryRequest.promise);
    renderPage();
    await screen.findByRole('article', { name: HOUSE.title });
    const originalCard = card(HOUSE.title);
    await user.click(screen.getByRole('button', { name: 'Cargar más propiedades' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar más propiedades');
    expect(titles()).toEqual([HOUSE.title, LAND.title]);
    expect(card(HOUSE.title)).toBe(originalCard);
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(screen.getByRole('button', { name: 'Cargando más propiedades...' })).toBeDisabled();
    expect(titles()).toEqual([HOUSE.title, LAND.title]);
    await act(async () => retryRequest.resolve(result([NEXT], { page: 2, total: 3 })));

    expect(titles()).toEqual([HOUSE.title, LAND.title, NEXT.title]);
    expect(api.getPublicProperties.mock.calls.map(([params]) => params.page)).toEqual([1, 2, 2]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('respeta hasNextPage aunque la página tenga menos de 12 resultados y permite una tercera página', async () => {
    const user = userEvent.setup();
    api.getPublicProperties
      .mockResolvedValueOnce(result([HOUSE], { hasNextPage: true, total: 3 }))
      .mockResolvedValueOnce(result([LAND], { page: 2, hasNextPage: true, total: 3 }))
      .mockResolvedValueOnce(result([NEXT], { page: 3, total: 3 }));
    renderPage();
    await screen.findByRole('article');
    await user.click(screen.getByRole('button', { name: 'Cargar más propiedades' }));
    await screen.findByRole('article', { name: LAND.title });
    await user.click(screen.getByRole('button', { name: 'Cargar más propiedades' }));
    await screen.findByRole('article', { name: NEXT.title });
    expect(api.getPublicProperties.mock.calls.map(([params]) => params.page)).toEqual([1, 2, 3]);
    expect(titles()).toEqual([HOUSE.title, LAND.title, NEXT.title]);
  });

  it('una última página vacía no borra resultados ni sigue ofreciendo cargar más', async () => {
    const user = userEvent.setup();
    api.getPublicProperties
      .mockResolvedValueOnce(result([HOUSE], { hasNextPage: true, total: 1 }))
      .mockResolvedValueOnce(result([], { page: 2, total: 1 }));
    renderPage();
    await screen.findByRole('article');
    await user.click(screen.getByRole('button', { name: 'Cargar más propiedades' }));
    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
    expect(titles()).toEqual([HOUSE.title]);
  });

  it('ignora respuestas que llegan después de abandonar la página', async () => {
    const pending = deferred();
    api.getPublicProperties.mockReturnValue(pending.promise);
    const { unmount } = renderPage();
    unmount();
    await act(async () => pending.resolve(result([HOUSE])));
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});

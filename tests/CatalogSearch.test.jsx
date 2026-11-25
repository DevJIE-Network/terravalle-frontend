import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api';
import CatalogPage from '@/pages/Catalog/CatalogPage';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getPublicProperties: vi.fn(),
  getPublicServiceCatalog: vi.fn(),
}));

const HOUSE = {
  id: 9,
  title: 'Casa con jardín en Tula',
  propertyType: { id: 2, name: 'Casa' },
  publicationPrice: 1500000,
  location: { municipality: 'Tula de Allende', state: 'Hidalgo' },
  landArea: 200,
  hasConstruction: true,
  builtArea: 120,
};
const LAND = {
  id: 2,
  title: 'Terreno en Tepeji',
  propertyType: { id: 1, name: 'Terreno' },
  publicationPrice: 500000,
  location: { municipality: 'Tepeji del Río', state: 'Hidalgo' },
  landArea: 300,
  hasConstruction: false,
};
const NEXT = { ...LAND, id: 7, title: 'Terreno junto al valle' };

const SERVICES = [
  { id: 1, name: 'Agua potable', description: null },
  { id: 2, name: 'Electricidad', description: null },
];

function result(properties, { page = 1, hasNextPage = false, total = properties.length } = {}) {
  return {
    properties,
    pagination: {
      page,
      limit: 12,
      total,
      totalPages: hasNextPage ? page + 1 : Math.max(page, 1),
      hasNextPage,
      hasPreviousPage: page > 1,
    },
  };
}

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>;
}

function renderCatalog(url = '/catalogo') {
  const router = createMemoryRouter(
    [
      {
        path: '/catalogo',
        element: (
          <>
            <CatalogPage />
            <LocationProbe />
          </>
        ),
      },
    ],
    { initialEntries: [url] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const lastCall = () => api.getPublicProperties.mock.calls.at(-1)[0];
const currentUrl = () => screen.getByTestId('location').textContent;
const field = (name) => screen.getByLabelText(name);
const titles = () =>
  screen.queryAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
const chipList = () => screen.queryByRole('list', { name: 'Filtros activos' });
const chipLabels = () =>
  within(chipList())
    .getAllByRole('listitem')
    .map((item) => item.textContent.replace('×', ''));

beforeEach(() => {
  api.getPublicServiceCatalog.mockReset().mockResolvedValue(SERVICES);
  api.getPublicProperties.mockReset().mockResolvedValue(result([HOUSE, LAND]));
});

describe('barra de búsqueda y panel de filtros', () => {
  it('muestra la barra, el panel con todos los criterios y los servicios del catálogo', async () => {
    renderCatalog();
    await screen.findByRole('article', { name: HOUSE.title });

    expect(
      screen.getByRole('search', { name: 'Buscar y filtrar propiedades' }),
    ).toBeInTheDocument();
    for (const label of [
      'Buscar propiedades',
      'Tipo de inmueble',
      'Estado',
      'Municipio',
      'Precio mínimo (MXN)',
      'Precio máximo (MXN)',
      'Construcción',
      'Superficie mínima (m²)',
      'Superficie máxima (m²)',
    ]) {
      expect(field(label)).toBeInTheDocument();
    }
    expect(await screen.findByRole('checkbox', { name: 'Agua potable' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Electricidad' })).toBeInTheDocument();
    expect(api.getPublicServiceCatalog).toHaveBeenCalledTimes(1);
    // Sin criterios: catálogo general como antes, y sin etiquetas ni "Limpiar filtros".
    expect(api.getPublicProperties).toHaveBeenCalledExactlyOnceWith({ page: 1, limit: 12 });
    expect(chipList()).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument();
  });

  it('CA1: combina filtros, consulta con todos, muestra las etiquetas y refleja la URL', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await screen.findByRole('article', { name: HOUSE.title });
    await screen.findByRole('checkbox', { name: 'Agua potable' });
    api.getPublicProperties.mockResolvedValue(result([LAND]));

    await user.type(field('Buscar propiedades'), 'terreno');
    await user.selectOptions(field('Tipo de inmueble'), 'Terreno');
    await user.type(field('Precio máximo (MXN)'), '600000');
    await user.type(field('Estado'), 'Hidalgo');
    await user.type(field('Superficie mínima (m²)'), '250');
    await user.selectOptions(field('Construcción'), 'Sin construcción');
    await user.click(screen.getByRole('checkbox', { name: 'Agua potable' }));
    await user.click(screen.getByRole('checkbox', { name: 'Electricidad' }));
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    await waitFor(() => expect(titles()).toEqual([LAND.title]));
    expect(lastCall()).toEqual({
      page: 1,
      limit: 12,
      q: 'terreno',
      propertyTypeId: 1,
      maxPrice: 600000,
      state: 'Hidalgo',
      minLandArea: 250,
      hasConstruction: false,
      serviceIds: [1, 2],
    });
    expect(chipLabels()).toEqual([
      'Búsqueda: “terreno”',
      'Tipo: Terreno',
      'Precio: hasta $600,000',
      'Estado: Hidalgo',
      'Superficie: desde 250 m²',
      'Sin construcción',
      'Servicio: Agua potable',
      'Servicio: Electricidad',
    ]);
    expect(currentUrl()).toBe(
      '/catalogo?q=terreno&propertyTypeId=1&maxPrice=600000&state=Hidalgo&minLandArea=250&hasConstruction=false&serviceIds=1%2C2',
    );
  });

  it('Enter en la barra de búsqueda también aplica la búsqueda', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await screen.findByRole('article', { name: HOUSE.title });

    await user.type(field('Buscar propiedades'), 'tula{Enter}');

    await waitFor(() => expect(lastCall()).toEqual({ page: 1, limit: 12, q: 'tula' }));
    expect(currentUrl()).toBe('/catalogo?q=tula');
  });

  it('CA2: sin resultados explica que no hay coincidencias y ofrece limpiar los filtros', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await screen.findByRole('article', { name: HOUSE.title });
    api.getPublicProperties.mockResolvedValue(result([], { total: 0 }));

    await user.selectOptions(field('Tipo de inmueble'), 'Departamento');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    expect(
      await screen.findByText('No se encontraron propiedades con estos filtros.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('No hay propiedades disponibles en este momento.')).toBeNull();
    // No es un error: no aparece el estado de error del catálogo.
    expect(screen.queryByText('No pudimos cargar el catálogo')).not.toBeInTheDocument();
    expect(chipLabels()).toEqual(['Tipo: Departamento']);

    api.getPublicProperties.mockResolvedValue(result([HOUSE, LAND]));
    const empty = screen.getByText(
      'No se encontraron propiedades con estos filtros.',
    ).parentElement;
    await user.click(within(empty).getByRole('button', { name: 'Limpiar filtros' }));
    await screen.findByRole('article', { name: HOUSE.title });
    expect(currentUrl()).toBe('/catalogo');
  });

  it('CA3: limpiar filtros vuelve al catálogo general, sin etiquetas y con los campos vacíos', async () => {
    const user = userEvent.setup();
    renderCatalog('/catalogo?q=casa&maxPrice=900000');
    await screen.findByRole('article', { name: HOUSE.title });
    expect(field('Precio máximo (MXN)')).toHaveValue('900000');
    api.getPublicProperties.mockClear();

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    await waitFor(() =>
      expect(api.getPublicProperties).toHaveBeenCalledExactlyOnceWith({ page: 1, limit: 12 }),
    );
    expect(currentUrl()).toBe('/catalogo');
    expect(chipList()).not.toBeInTheDocument();
    expect(field('Buscar propiedades')).toHaveValue('');
    expect(field('Precio máximo (MXN)')).toHaveValue('');
    expect(titles()).toEqual([HOUSE.title, LAND.title]);
  });

  it('quita un filtro a la vez desde su etiqueta y conserva los demás', async () => {
    const user = userEvent.setup();
    renderCatalog('/catalogo?q=casa&state=Hidalgo&minPrice=100&maxPrice=900');
    await screen.findByRole('article', { name: HOUSE.title });
    api.getPublicProperties.mockClear();

    await user.click(screen.getByRole('button', { name: 'Quitar filtro: Precio: $100 – $900' }));

    await waitFor(() =>
      expect(lastCall()).toEqual({ page: 1, limit: 12, q: 'casa', state: 'Hidalgo' }),
    );
    expect(chipLabels()).toEqual(['Búsqueda: “casa”', 'Estado: Hidalgo']);
    expect(currentUrl()).toBe('/catalogo?q=casa&state=Hidalgo');
    expect(field('Precio mínimo (MXN)')).toHaveValue('');
  });

  it('CA4: un mínimo mayor que el máximo marca los campos, pide corregir y no envía la consulta', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await screen.findByRole('article', { name: HOUSE.title });
    api.getPublicProperties.mockClear();

    await user.type(field('Precio mínimo (MXN)'), '900000');
    await user.type(field('Precio máximo (MXN)'), '100000');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    expect(field('Precio mínimo (MXN)')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Precio máximo (MXN)')).toHaveAttribute('aria-invalid', 'true');
    expect(
      screen.getByText('El precio mínimo no puede ser mayor que el máximo.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('El precio máximo no puede ser menor que el mínimo.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(field('Precio mínimo (MXN)')).toHaveFocus());
    expect(api.getPublicProperties).not.toHaveBeenCalled();
    expect(currentUrl()).toBe('/catalogo');

    // Al corregir, el error del campo desaparece y la búsqueda se envía.
    await user.clear(field('Precio mínimo (MXN)'));
    await user.type(field('Precio mínimo (MXN)'), '50000');
    expect(field('Precio mínimo (MXN)')).not.toHaveAttribute('aria-invalid', 'true');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    await waitFor(() =>
      expect(lastCall()).toEqual({ page: 1, limit: 12, minPrice: 50000, maxPrice: 100000 }),
    );
  });

  it('CA4: valores no numéricos o negativos tampoco se envían', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await screen.findByRole('article', { name: HOUSE.title });
    api.getPublicProperties.mockClear();

    await user.type(field('Superficie mínima (m²)'), '-5');
    await user.type(field('Precio máximo (MXN)'), 'mucho');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    expect(field('Superficie mínima (m²)')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Precio máximo (MXN)')).toHaveAttribute('aria-invalid', 'true');
    expect(api.getPublicProperties).not.toHaveBeenCalled();
  });

  it('abre la búsqueda guardada en la URL: consulta con esos criterios y precarga el formulario', async () => {
    renderCatalog(
      '/catalogo?q=casa&propertyTypeId=2&maxPrice=2000000&hasConstruction=true&serviceIds=1',
    );
    await screen.findByRole('article', { name: HOUSE.title });

    expect(api.getPublicProperties).toHaveBeenCalledExactlyOnceWith({
      page: 1,
      limit: 12,
      q: 'casa',
      propertyTypeId: 2,
      maxPrice: 2000000,
      hasConstruction: true,
      serviceIds: [1],
    });
    expect(field('Buscar propiedades')).toHaveValue('casa');
    expect(field('Tipo de inmueble')).toHaveValue('2');
    expect(field('Construcción')).toHaveValue('true');
    expect(await screen.findByRole('checkbox', { name: 'Agua potable' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Electricidad' })).not.toBeChecked();
    expect(chipLabels()).toContain('Servicio: Agua potable');
  });

  it('una URL con criterios inválidos no consulta y marca los campos a corregir', async () => {
    renderCatalog('/catalogo?minPrice=900&maxPrice=100&propertyTypeId=99');
    await screen.findByText('El precio mínimo no puede ser mayor que el máximo.');

    expect(api.getPublicProperties).not.toHaveBeenCalled();
    expect(field('Precio mínimo (MXN)')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Tipo de inmueble')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(chipList()).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Corrige los criterios de búsqueda marcados.',
    );
  });

  it('al cambiar los criterios reinicia la paginación y reemplaza la lista', async () => {
    const user = userEvent.setup();
    api.getPublicProperties
      .mockReset()
      .mockResolvedValueOnce(result([HOUSE], { hasNextPage: true, total: 2 }))
      .mockResolvedValueOnce(result([LAND], { page: 2, total: 2 }));
    renderCatalog();
    await screen.findByRole('article', { name: HOUSE.title });
    await user.click(screen.getByRole('button', { name: 'Cargar más propiedades' }));
    await waitFor(() => expect(titles()).toEqual([HOUSE.title, LAND.title]));
    expect(lastCall()).toEqual({ page: 2, limit: 12 });

    api.getPublicProperties.mockResolvedValue(result([NEXT], { total: 1 }));
    await user.type(field('Buscar propiedades'), 'valle');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(titles()).toEqual([NEXT.title]));
    expect(lastCall()).toEqual({ page: 1, limit: 12, q: 'valle' });
    expect(
      screen.queryByRole('button', { name: 'Cargar más propiedades' }),
    ).not.toBeInTheDocument();
  });

  it('mantiene la paginación al filtrar: "cargar más" conserva los criterios', async () => {
    const user = userEvent.setup();
    api.getPublicProperties
      .mockReset()
      .mockResolvedValueOnce(result([HOUSE], { hasNextPage: true, total: 2 }))
      .mockResolvedValueOnce(result([NEXT], { page: 2, total: 2 }));
    renderCatalog('/catalogo?state=Hidalgo');
    await screen.findByRole('article', { name: HOUSE.title });

    await user.click(screen.getByRole('button', { name: 'Cargar más propiedades' }));

    await waitFor(() => expect(titles()).toEqual([HOUSE.title, NEXT.title]));
    expect(lastCall()).toEqual({ page: 2, limit: 12, state: 'Hidalgo' });
    expect(
      screen.getByText('Has visto todas las propiedades que cumplen tus filtros.'),
    ).toBeInTheDocument();
  });

  it('volver con el historial restaura la búsqueda anterior', async () => {
    const user = userEvent.setup();
    const router = renderCatalog();
    await screen.findByRole('article', { name: HOUSE.title });

    await user.type(field('Estado'), 'Jalisco');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    await waitFor(() => expect(chipLabels()).toEqual(['Estado: Jalisco']));

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => expect(chipList()).not.toBeInTheDocument());
    expect(field('Estado')).toHaveValue('');
    expect(lastCall()).toEqual({ page: 1, limit: 12 });
  });

  it('en móvil el panel es desplegable y se abre solo cuando hay un error que corregir', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await screen.findByRole('article', { name: HOUSE.title });

    const toggle = screen.getByRole('button', { name: 'Filtros' });
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveClass('lg:hidden');
    expect(panel).toHaveClass('hidden', 'lg:flex');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toHaveClass('flex');
    expect(panel).not.toHaveClass('hidden');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // Con un error de validación el panel se abre para que se vea el campo marcado.
    await user.type(field('Precio mínimo (MXN)'), 'x');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('las etiquetas de filtros activos se muestran fuera del panel plegable', async () => {
    renderCatalog('/catalogo?q=casa');
    await screen.findByRole('article', { name: HOUSE.title });
    const toggle = screen.getByRole('button', { name: 'Filtros' });
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(panel).not.toContainElement(chipList());
  });

  it('si no se pueden cargar los servicios, avisa y permite buscar con los demás filtros', async () => {
    const user = userEvent.setup();
    api.getPublicServiceCatalog.mockReset().mockRejectedValue(new Error('sin conexión'));
    renderCatalog();
    await screen.findByRole('article', { name: HOUSE.title });

    expect(
      await screen.findByText(/No pudimos cargar los servicios disponibles/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    await user.type(field('Municipio'), 'Tula');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    await waitFor(() => expect(lastCall()).toEqual({ page: 1, limit: 12, municipality: 'Tula' }));
  });

  it('un error del servidor al filtrar muestra el estado de error con reintento', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await screen.findByRole('article', { name: HOUSE.title });
    api.getPublicProperties.mockRejectedValueOnce(new Error('falló'));

    await user.type(field('Buscar propiedades'), 'casa');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('No pudimos cargar el catálogo')).toBeInTheDocument();
    expect(chipLabels()).toEqual(['Búsqueda: “casa”']);

    await user.click(screen.getByRole('button', { name: /Reintentar/ }));
    await screen.findByRole('article', { name: HOUSE.title });
  });

  it('ignora la respuesta de una búsqueda anterior si ya se aplicó otra', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await screen.findByRole('article', { name: HOUSE.title });

    let resolveSlow;
    api.getPublicProperties.mockImplementationOnce(
      () => new Promise((resolve) => (resolveSlow = resolve)),
    );
    await user.type(field('Buscar propiedades'), 'lenta');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    api.getPublicProperties.mockResolvedValueOnce(result([NEXT], { total: 1 }));
    await user.clear(field('Buscar propiedades'));
    await user.type(field('Buscar propiedades'), 'rapida');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(titles()).toEqual([NEXT.title]));

    await act(async () => resolveSlow(result([HOUSE], { total: 1 })));
    expect(titles()).toEqual([NEXT.title]);
  });
});

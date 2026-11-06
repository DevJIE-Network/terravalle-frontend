import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api';
import MyPropertiesPage from '@/pages/MyProperties/MyPropertiesPage';
import { ROUTES } from '@/utils/constants';
import { renderWithSession } from './renderWithSession';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  listMyProperties: vi.fn(),
  changePropertyStatus: vi.fn(),
  withdrawProperty: vi.fn(),
}));

const ACTIVE = {
  id: '1',
  title: 'Casa en Tula',
  status: 'active',
  publicationPrice: 1500000,
  primaryPhotoUrl: 'https://img.test/casa.jpg',
};

const DRAFT = {
  id: '2',
  title: 'Terreno en Tepeji',
  status: 'draft',
  publicationPrice: null,
  hasDimensions: false,
  servicesCount: 0,
};

const WITHDRAWN = { id: '3', title: 'Bodega vieja', status: 'withdrawn', publicationPrice: 90000 };

const result = (
  properties,
  pagination = { page: 1, limit: 12, total: properties.length, totalPages: 1 },
) => ({
  properties,
  pagination,
});

function renderPage() {
  return renderWithSession([{ path: ROUTES.MY_PROPERTIES, element: <MyPropertiesPage /> }], {
    path: ROUTES.MY_PROPERTIES,
  });
}

async function ready() {
  return screen.findAllByRole('article');
}

const card = (title) => screen.getByRole('article', { name: title });
const dialog = () => screen.getByRole('dialog');

beforeEach(() => {
  api.listMyProperties.mockReset().mockResolvedValue(result([ACTIVE, DRAFT, WITHDRAWN]));
  api.changePropertyStatus.mockReset();
  api.withdrawProperty.mockReset();
});

describe('HU-024 · Panel de mis propiedades', () => {
  it('CA1: muestra solo lo que devuelve el backend, con el estado de cada una en texto', async () => {
    renderPage();
    await ready();

    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(within(card('Casa en Tula')).getByText('Activa')).toBeInTheDocument();
    expect(within(card('Terreno en Tepeji')).getByText('Borrador')).toBeInTheDocument();
    expect(within(card('Bodega vieja')).getByText('Retirada')).toBeInTheDocument();
    expect(api.listMyProperties).toHaveBeenCalledWith({ status: undefined, page: 1, limit: 12 });
  });

  it('muestra la fotografía principal o un aviso si no hay', async () => {
    renderPage();
    await ready();

    expect(within(card('Casa en Tula')).getByRole('img')).toHaveAttribute(
      'src',
      'https://img.test/casa.jpg',
    );
    expect(within(card('Terreno en Tepeji')).getByText('Sin fotografía')).toBeInTheDocument();
  });

  it('indica la información pendiente y enlaza a los formularios correspondientes', async () => {
    renderPage();
    await ready();

    const pending = within(card('Terreno en Tepeji')).getByRole('group', {
      name: 'Información pendiente',
    });
    expect(within(pending).getByRole('link', { name: /Dimensiones/ })).toHaveAttribute(
      'href',
      '/mis-propiedades/2/dimensiones',
    );
    expect(within(pending).getByRole('link', { name: /Servicios/ })).toHaveAttribute(
      'href',
      '/mis-propiedades/2/servicios',
    );
    expect(within(pending).getByRole('link', { name: /Precio/ })).toHaveAttribute(
      'href',
      '/mis-propiedades/2/editar',
    );
    expect(
      within(card('Casa en Tula')).queryByRole('group', { name: 'Información pendiente' }),
    ).not.toBeInTheDocument();
  });

  it('cada propiedad ofrece editar y las acciones que le corresponden', async () => {
    renderPage();
    await ready();

    const active = within(card('Casa en Tula'));
    expect(active.getByRole('link', { name: 'Editar' })).toHaveAttribute(
      'href',
      '/mis-propiedades/1/editar',
    );
    expect(active.getByRole('button', { name: 'Desactivar Casa en Tula' })).toBeInTheDocument();
    expect(active.getByRole('button', { name: 'Retirar Casa en Tula' })).toBeInTheDocument();
    expect(active.queryByRole('button', { name: /^Activar/ })).not.toBeInTheDocument();

    expect(
      within(card('Terreno en Tepeji')).getByRole('button', { name: 'Activar Terreno en Tepeji' }),
    ).toBeInTheDocument();
  });

  it('una propiedad retirada no ofrece acciones', async () => {
    renderPage();
    await ready();

    const withdrawn = within(card('Bodega vieja'));
    expect(withdrawn.queryByRole('button')).not.toBeInTheDocument();
    expect(withdrawn.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument();
    expect(withdrawn.getByText(/ya no se puede editar/)).toBeInTheDocument();
  });

  it('sin propiedades muestra el estado vacío con la invitación a registrar la primera', async () => {
    api.listMyProperties.mockResolvedValue(result([]));
    renderPage();

    expect(await screen.findByText('Aún no has publicado propiedades')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Registrar mi primera propiedad' })).toHaveAttribute(
      'href',
      ROUTES.CREATE_PROPERTY,
    );
    expect(screen.queryByLabelText('Mostrar')).not.toBeInTheDocument();
  });

  it('si falla la carga muestra el error y permite reintentar', async () => {
    const user = userEvent.setup();
    api.listMyProperties.mockRejectedValueOnce(new Error('No hay conexión.'));
    renderPage();

    expect(await screen.findByText('No hay conexión.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findAllByRole('article')).toHaveLength(3);
  });
});

describe('HU-024 · Confirmación y cambio de visibilidad', () => {
  it('CA3: desactivar pide confirmación y luego muestra la propiedad como inactiva', async () => {
    const user = userEvent.setup();
    api.changePropertyStatus.mockResolvedValue({ id: '1', status: 'inactive' });
    renderPage();
    await ready();

    await user.click(screen.getByRole('button', { name: 'Desactivar Casa en Tula' }));

    expect(dialog()).toHaveAccessibleName('¿Desactivar esta propiedad?');
    expect(dialog()).toHaveTextContent(/dejará de mostrarse como disponible/);
    expect(api.changePropertyStatus).not.toHaveBeenCalled();

    await user.click(within(dialog()).getByRole('button', { name: 'Desactivar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.changePropertyStatus).toHaveBeenCalledWith('1', 'inactive');
    expect(within(card('Casa en Tula')).getByText('Inactiva')).toBeInTheDocument();
    expect(
      within(card('Casa en Tula')).getByText('No visible para compradores'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/ya no se muestra como disponible/);
    // Conserva los demás datos de la tarjeta aunque el backend devuelva menos campos.
    expect(within(card('Casa en Tula')).getByRole('img')).toBeInTheDocument();
  });

  it('cancelar el diálogo no cambia nada', async () => {
    const user = userEvent.setup();
    renderPage();
    await ready();

    await user.click(screen.getByRole('button', { name: 'Desactivar Casa en Tula' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.changePropertyStatus).not.toHaveBeenCalled();
    expect(within(card('Casa en Tula')).getByText('Activa')).toBeInTheDocument();
  });

  it('Esc también cancela', async () => {
    const user = userEvent.setup();
    renderPage();
    await ready();

    await user.click(screen.getByRole('button', { name: 'Desactivar Casa en Tula' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.changePropertyStatus).not.toHaveBeenCalled();
  });

  it('activar también pide confirmación y avisa de lo pendiente', async () => {
    const user = userEvent.setup();
    api.changePropertyStatus.mockResolvedValue({ id: '2', status: 'active' });
    renderPage();
    await ready();

    await user.click(screen.getByRole('button', { name: 'Activar Terreno en Tepeji' }));
    expect(dialog()).toHaveTextContent(/información pendiente: Dimensiones y construcción/);
    expect(api.changePropertyStatus).not.toHaveBeenCalled();

    await user.click(within(dialog()).getByRole('button', { name: 'Activar' }));
    await waitFor(() =>
      expect(within(card('Terreno en Tepeji')).getByText('Activa')).toBeInTheDocument(),
    );
    expect(api.changePropertyStatus).toHaveBeenCalledWith('2', 'active');
  });

  it('retirar advierte que es definitivo y deja la propiedad sin acciones', async () => {
    const user = userEvent.setup();
    api.withdrawProperty.mockResolvedValue({ id: '1', status: 'withdrawn' });
    renderPage();
    await ready();

    await user.click(screen.getByRole('button', { name: 'Retirar Casa en Tula' }));
    expect(dialog()).toHaveTextContent(/definitiva/);

    await user.click(within(dialog()).getByRole('button', { name: 'Retirar definitivamente' }));

    await waitFor(() =>
      expect(within(card('Casa en Tula')).getByText('Retirada')).toBeInTheDocument(),
    );
    expect(api.withdrawProperty).toHaveBeenCalledWith('1');
    expect(within(card('Casa en Tula')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('si el backend rechaza el cambio (409) el diálogo sigue abierto con el motivo', async () => {
    const user = userEvent.setup();
    api.changePropertyStatus.mockRejectedValue(
      Object.assign(new Error('Ocurrió un error inesperado.'), {
        status: 409,
        details: { message: 'La propiedad ya cambió de estado.' },
      }),
    );
    renderPage();
    await ready();

    await user.click(screen.getByRole('button', { name: 'Desactivar Casa en Tula' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Desactivar' }));

    expect(
      await within(dialog()).findByText('La propiedad ya cambió de estado.'),
    ).toBeInTheDocument();
    expect(within(card('Casa en Tula')).getByText('Activa')).toBeInTheDocument();
  });
});

describe('HU-024 · Filtro y paginación', () => {
  it('filtrar por estado vuelve a consultar con ese estado desde la página 1', async () => {
    const user = userEvent.setup();
    renderPage();
    await ready();

    api.listMyProperties.mockResolvedValue(result([ACTIVE]));
    await user.selectOptions(screen.getByLabelText('Mostrar'), 'active');

    await waitFor(() =>
      expect(api.listMyProperties).toHaveBeenLastCalledWith({
        status: 'active',
        page: 1,
        limit: 12,
      }),
    );
    expect(await screen.findAllByRole('article')).toHaveLength(1);
  });

  it('con filtro activo, desactivar una propiedad la quita de esa vista', async () => {
    const user = userEvent.setup();
    renderPage();
    await ready();

    api.listMyProperties.mockResolvedValue(result([ACTIVE]));
    await user.selectOptions(screen.getByLabelText('Mostrar'), 'active');
    await screen.findByRole('article', { name: 'Casa en Tula' });

    api.changePropertyStatus.mockResolvedValue({ id: '1', status: 'inactive' });
    await user.click(screen.getByRole('button', { name: 'Desactivar Casa en Tula' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByText('No hay propiedades con ese estado')).toBeInTheDocument();
  });

  it('un filtro sin resultados ofrece ver todas', async () => {
    const user = userEvent.setup();
    renderPage();
    await ready();

    api.listMyProperties.mockResolvedValue(result([]));
    await user.selectOptions(screen.getByLabelText('Mostrar'), 'inactive');
    expect(await screen.findByText('No hay propiedades con ese estado')).toBeInTheDocument();

    api.listMyProperties.mockResolvedValue(result([ACTIVE]));
    await user.click(screen.getByRole('button', { name: 'Ver todas' }));
    expect(await screen.findAllByRole('article')).toHaveLength(1);
    expect(api.listMyProperties).toHaveBeenLastCalledWith({
      status: undefined,
      page: 1,
      limit: 12,
    });
  });

  it('pagina con Anterior y Siguiente', async () => {
    const user = userEvent.setup();
    api.listMyProperties.mockResolvedValue(
      result([ACTIVE], { page: 1, limit: 12, total: 20, totalPages: 2 }),
    );
    renderPage();
    await ready();

    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    api.listMyProperties.mockResolvedValue(
      result([DRAFT], { page: 2, limit: 12, total: 20, totalPages: 2 }),
    );
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument();
    expect(api.listMyProperties).toHaveBeenLastCalledWith({
      status: undefined,
      page: 2,
      limit: 12,
    });
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });
});

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api';
import EditPropertyPage from '@/pages/EditProperty/EditPropertyPage';
import { buildPropertyEditPath, ROUTES } from '@/utils/constants';
import { renderWithSession } from './renderWithSession';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getMyProperty: vi.fn(),
  updateProperty: vi.fn(),
}));

const PROPERTY = {
  id: '7',
  title: 'Casa en Tula',
  propertyTypeId: 2,
  description: 'Bonita casa',
  publicationPrice: 1500000,
  status: 'draft',
};

function renderPage() {
  return renderWithSession([{ path: ROUTES.PROPERTY_EDIT, element: <EditPropertyPage /> }], {
    path: buildPropertyEditPath(7),
  });
}

async function ready() {
  return screen.findByRole('heading', { name: 'Datos generales' });
}

const field = (label) => screen.getByLabelText(label);
const saveButton = () => screen.getByRole('button', { name: /Guardar cambios|Guardando/ });
const apiError = (status, details = null, message = 'Error') =>
  Object.assign(new Error(message), { status, details });

beforeEach(() => {
  api.getMyProperty.mockReset().mockResolvedValue(PROPERTY);
  api.updateProperty.mockReset();
});

describe('HU-024 · Edición de una propiedad propia', () => {
  it('arma la ruta de edición', () => {
    expect(buildPropertyEditPath(7)).toBe('/mis-propiedades/7/editar');
  });

  it('precarga los datos actuales y muestra los datos vigentes', async () => {
    renderPage();
    await ready();

    expect(api.getMyProperty).toHaveBeenCalledWith('7');
    expect(field('Título de la publicación')).toHaveValue('Casa en Tula');
    expect(field('Tipo de propiedad')).toHaveValue('2');
    expect(field('Descripción')).toHaveValue('Bonita casa');
    expect(field('Precio de publicación (MXN)')).toHaveValue('1500000');
    expect(screen.getByText('Datos vigentes')).toBeInTheDocument();
    expect(screen.getByText('Borrador')).toBeInTheDocument();
  });

  it('sin cambios no se puede guardar', async () => {
    renderPage();
    await ready();
    expect(saveButton()).toBeDisabled();
  });

  it('CA2: guarda solo lo que cambió, confirma y muestra los datos vigentes', async () => {
    const user = userEvent.setup();
    api.updateProperty.mockResolvedValue({
      message: 'Propiedad actualizada.',
      property: { id: '7', title: 'Casa renovada', publicationPrice: 1600000 },
    });
    renderPage();
    await ready();

    await user.clear(field('Título de la publicación'));
    await user.type(field('Título de la publicación'), 'Casa renovada');
    await user.clear(field('Precio de publicación (MXN)'));
    await user.type(field('Precio de publicación (MXN)'), '1600000');
    await user.click(saveButton());

    expect(await screen.findByText('Propiedad actualizada.')).toBeInTheDocument();
    expect(api.updateProperty).toHaveBeenCalledWith('7', {
      title: 'Casa renovada',
      publicationPrice: 1600000,
    });
    expect(screen.getByText(/«Casa renovada»/)).toBeInTheDocument();
    expect(screen.getByText(/1,600,000/)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('vaciar el precio lo envía como null', async () => {
    const user = userEvent.setup();
    api.updateProperty.mockResolvedValue({ property: { publicationPrice: null } });
    renderPage();
    await ready();

    await user.clear(field('Precio de publicación (MXN)'));
    await user.click(saveButton());

    await waitFor(() =>
      expect(api.updateProperty).toHaveBeenCalledWith('7', { publicationPrice: null }),
    );
    expect(await screen.findByText('Los cambios se guardaron correctamente.')).toBeInTheDocument();
    expect(screen.getByText('Sin definir')).toBeInTheDocument();
  });

  it('valida en pantalla y no envía si hay datos inválidos', async () => {
    const user = userEvent.setup();
    renderPage();
    await ready();

    await user.clear(field('Título de la publicación'));
    await user.type(field('Título de la publicación'), 'ab');
    await user.clear(field('Precio de publicación (MXN)'));
    await user.type(field('Precio de publicación (MXN)'), '-5');
    await user.click(saveButton());

    expect(
      await screen.findByText('El título debe tener al menos 3 caracteres.'),
    ).toBeInTheDocument();
    expect(screen.getByText('El precio no puede ser negativo.')).toBeInTheDocument();
    expect(field('Título de la publicación')).toHaveAttribute('aria-invalid', 'true');
    expect(api.updateProperty).not.toHaveBeenCalled();
  });

  it('muestra los errores por campo que devuelve el backend y conserva lo escrito', async () => {
    const user = userEvent.setup();
    api.updateProperty.mockRejectedValue(
      apiError(
        400,
        { errors: [{ field: 'title', message: 'Título no permitido.' }] },
        'Datos inválidos.',
      ),
    );
    renderPage();
    await ready();

    await user.type(field('Título de la publicación'), ' nuevo');
    await user.click(saveButton());

    expect(await screen.findByText('Título no permitido.')).toBeInTheDocument();
    expect(screen.getByText('Datos inválidos.')).toBeInTheDocument();
    expect(field('Título de la publicación')).toHaveValue('Casa en Tula nuevo');
  });

  it('si la propiedad cambió mientras tanto (409) muestra el motivo del backend', async () => {
    const user = userEvent.setup();
    api.updateProperty.mockRejectedValue(
      apiError(409, { message: 'La propiedad fue modificada mientras tanto.' }),
    );
    renderPage();
    await ready();

    await user.type(field('Descripción'), ' extra');
    await user.click(saveButton());

    expect(
      await screen.findByText('La propiedad fue modificada mientras tanto.'),
    ).toBeInTheDocument();
  });

  it('una propiedad retirada no se puede editar', async () => {
    api.getMyProperty.mockResolvedValue({ ...PROPERTY, status: 'withdrawn' });
    renderPage();
    await ready();

    expect(screen.getByText('Propiedad retirada')).toBeInTheDocument();
    expect(field('Título de la publicación')).toBeDisabled();
    expect(saveButton()).toBeDisabled();
    expect(screen.queryByText('Completar información')).not.toBeInTheDocument();
  });

  it('enlaza a los formularios de dimensiones, servicios y estimación', async () => {
    renderPage();
    await ready();

    expect(screen.getByRole('link', { name: 'Dimensiones y construcción' })).toHaveAttribute(
      'href',
      '/mis-propiedades/7/dimensiones',
    );
    expect(screen.getByRole('link', { name: 'Servicios disponibles' })).toHaveAttribute(
      'href',
      '/mis-propiedades/7/servicios',
    );
    expect(screen.getByRole('link', { name: 'Estimación del valor' })).toHaveAttribute(
      'href',
      '/mis-propiedades/7/estimacion',
    );
  });
});

describe('HU-024 · Acceso a una propiedad ajena', () => {
  it('CA4: con 403 muestra acceso denegado, sin reintento y sin datos ni formulario', async () => {
    api.getMyProperty.mockRejectedValue(apiError(403, null, 'No tienes permiso.'));
    renderPage();

    expect(await screen.findByText('Acceso denegado')).toBeInTheDocument();
    expect(screen.getByText(/no te pertenece/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Título de la publicación')).not.toBeInTheDocument();
    expect(screen.queryByText('Casa en Tula')).not.toBeInTheDocument();
    expect(screen.queryByText('Datos vigentes')).not.toBeInTheDocument();
  });

  it('con 404 indica que no se encontró la propiedad', async () => {
    api.getMyProperty.mockRejectedValue(apiError(404));
    renderPage();

    expect(await screen.findByText('Propiedad no encontrada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('un error de conexión sí permite reintentar', async () => {
    const user = userEvent.setup();
    api.getMyProperty.mockRejectedValueOnce(apiError(null, null, 'Sin conexión.'));
    renderPage();

    expect(await screen.findByText('Sin conexión.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await ready();
    expect(field('Título de la publicación')).toHaveValue('Casa en Tula');
  });
});

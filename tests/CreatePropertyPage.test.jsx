import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as propertyService from '@/api/property.service';
import CreatePropertyPage from '@/pages/CreateProperty/CreatePropertyPage';
import { buildPropertyDimensionsPath } from '@/utils/constants';
import { renderWithAuth } from './renderWithAuth';

vi.mock('@/api/property.service', async (importOriginal) => ({
  ...(await importOriginal()),
  createProperty: vi.fn(),
  uploadPropertyPhotos: vi.fn(),
}));

function renderPage() {
  return renderWithAuth(
    [
      { path: '/mis-propiedades/nueva', element: <CreatePropertyPage /> },
      { path: '/mis-propiedades', element: <p>Mis propiedades</p> },
      { path: '/mis-propiedades/:id/dimensiones', element: <p>Dimensiones</p> },
    ],
    { initialEntries: ['/mis-propiedades/nueva'], session: { token: 't', user: { name: 'Ana' } } },
  );
}

const title = () => screen.getByLabelText('Título de la publicación');
const type = () => screen.getByLabelText('Tipo de propiedad');
const description = () => screen.getByLabelText('Descripción');
const price = () => screen.getByLabelText('Precio de publicación');
const save = () => screen.getByRole('button', { name: 'Guardar propiedad' });

async function fillValid(user, { withPrice = true } = {}) {
  await user.type(title(), '  Casa en Tepeji  ');
  await user.selectOptions(type(), '2');
  await user.type(description(), 'Casa de dos plantas.');
  if (withPrice) await user.type(price(), '1450000');
}

function addPhoto(container, name = 'fachada.jpg') {
  const file = new File(['x'], name, { type: 'image/jpeg' });
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
}

beforeEach(() => {
  propertyService.createProperty.mockReset();
  propertyService.uploadPropertyPhotos.mockReset();
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview');
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe('HU-020 · Registrar propiedad', () => {
  it('pide título y tipo sin llamar al backend', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(save());

    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('Selecciona un tipo de propiedad.')).toBeInTheDocument();
    expect(type()).toHaveAttribute('aria-invalid', 'true');
    expect(propertyService.createProperty).not.toHaveBeenCalled();
  });

  it.each([
    ['Ca', 'El título debe tener al menos 3 caracteres.'],
    ['C'.repeat(151), 'El título no puede superar los 150 caracteres.'],
  ])('valida la longitud del título (%s)', async (value, message) => {
    const user = userEvent.setup();
    renderPage();

    fireEvent.change(title(), { target: { value } });
    await user.click(save());

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('valida la descripción y el precio', async () => {
    const user = userEvent.setup();
    renderPage();

    fireEvent.change(description(), { target: { value: 'd'.repeat(3001) } });
    fireEvent.change(price(), { target: { value: '-5' } });
    await user.click(save());

    expect(
      screen.getByText('La descripción no puede superar los 3000 caracteres.'),
    ).toBeInTheDocument();
    expect(screen.getByText('El precio no puede ser negativo.')).toBeInTheDocument();
    expect(screen.getByText('3001/3000')).toBeInTheDocument();
  });

  it('limpia el error de un campo al corregirlo', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(save());
    await user.type(title(), 'Casa');

    expect(screen.queryByText('El título es obligatorio.')).not.toBeInTheDocument();
  });

  it('crea la propiedad sin fotos y continúa a dimensiones', async () => {
    const user = userEvent.setup();
    propertyService.createProperty.mockResolvedValue({ property: { id: '7' } });
    const { router } = renderPage();

    await fillValid(user);
    await user.click(save());

    expect(propertyService.createProperty).toHaveBeenCalledWith({
      title: 'Casa en Tepeji',
      propertyTypeId: 2,
      description: 'Casa de dos plantas.',
      publicationPrice: 1450000,
    });
    expect(propertyService.uploadPropertyPhotos).not.toHaveBeenCalled();
    expect(await screen.findByText('Dimensiones')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(buildPropertyDimensionsPath('7'));
    expect(screen.getByTestId('message')).toHaveTextContent(/Propiedad registrada correctamente/);
  });

  it('sin precio no lo envía', async () => {
    const user = userEvent.setup();
    propertyService.createProperty.mockResolvedValue({ property: { id: '7' } });
    renderPage();

    await fillValid(user, { withPrice: false });
    await user.click(save());

    expect(propertyService.createProperty.mock.calls[0][0]).not.toHaveProperty('publicationPrice');
  });

  it('sube las fotos con progreso y libera las vistas previas', async () => {
    const user = userEvent.setup();
    propertyService.createProperty.mockResolvedValue({ property: { id: '9' } });
    let finishUpload;
    propertyService.uploadPropertyPhotos.mockImplementation((id, photos, onProgress) => {
      onProgress(45);
      return new Promise((resolve) => {
        finishUpload = resolve;
      });
    });
    const { container } = renderPage();

    await fillValid(user);
    addPhoto(container);
    await user.click(save());

    expect(await screen.findByText('Subiendo fotografías...')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    const [propertyId, photos] = propertyService.uploadPropertyPhotos.mock.calls[0];
    expect(propertyId).toBe('9');
    expect(photos).toHaveLength(1);

    await act(async () => finishUpload());
    expect(await screen.findByText('Dimensiones')).toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('avisa si el backend no devuelve el identificador', async () => {
    const user = userEvent.setup();
    propertyService.createProperty.mockResolvedValue({});
    renderPage();

    await fillValid(user);
    await user.click(save());

    expect(
      await screen.findByText('La propiedad fue creada, pero no se recibió su identificador.'),
    ).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it('muestra los errores de validación del backend en sus campos', async () => {
    const user = userEvent.setup();
    propertyService.createProperty.mockRejectedValue(
      Object.assign(new Error('Los datos enviados no son válidos.'), {
        status: 400,
        details: [
          { field: 'title', message: 'Ya tienes una propiedad con ese título.' },
          { message: 'Error sin campo' },
        ],
      }),
    );
    renderPage();

    await fillValid(user);
    await user.click(save());

    expect(await screen.findByText('Ya tienes una propiedad con ese título.')).toBeInTheDocument();
    expect(screen.getByText('Los datos enviados no son válidos.')).toBeInTheDocument();
  });

  it('muestra un error general y se puede cerrar', async () => {
    const user = userEvent.setup();
    propertyService.createProperty.mockRejectedValue(new Error(''));
    renderPage();

    await fillValid(user);
    await user.click(save());

    expect(await screen.findByText('No fue posible registrar la propiedad.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(screen.queryByText('No fue posible registrar la propiedad.')).not.toBeInTheDocument();
  });

  it('cancelar regresa a Mis propiedades', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(await screen.findByText('Mis propiedades')).toBeInTheDocument();
  });
});

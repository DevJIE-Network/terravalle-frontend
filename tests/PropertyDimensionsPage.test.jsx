import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api';
import PropertyDimensionsPage from '@/pages/PropertyDimensions/PropertyDimensionsPage';
import { buildPropertyDimensionsPath, ROUTES } from '@/utils/constants';
import { renderWithSession } from './renderWithSession';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  estimationService: { getMyProperty: vi.fn() },
  getPropertyDimensions: vi.fn(),
  savePropertyDimensions: vi.fn(),
}));

const PROPERTY = { id: '7', title: 'Casa en Tula', status: 'draft' };

const STORED = {
  landArea: 250,
  frontage: 10,
  depth: 25,
  hasConstruction: true,
  builtArea: 120,
  bedrooms: 3,
  bathrooms: 2,
  floors: 2,
  parkingSpaces: 1,
  age: 5,
  condition: 'good',
};

function renderPage() {
  return renderWithSession(
    [{ path: ROUTES.PROPERTY_DIMENSIONS, element: <PropertyDimensionsPage /> }],
    { path: buildPropertyDimensionsPath(7) },
  );
}

async function ready() {
  return screen.findByRole('heading', { name: 'Terreno' });
}

const field = (label) => screen.getByLabelText(label);

beforeEach(() => {
  api.estimationService.getMyProperty.mockReset().mockResolvedValue(PROPERTY);
  api.getPropertyDimensions.mockReset().mockResolvedValue(null);
  api.savePropertyDimensions.mockReset();
});

describe('HU-021 · Formulario de dimensiones', () => {
  it('arma la ruta del formulario', () => {
    expect(buildPropertyDimensionsPath(7)).toBe('/mis-propiedades/7/dimensiones');
  });

  it('muestra el formulario con terreno y el aviso de que es informativo', async () => {
    renderPage();
    await ready();

    expect(field('Superficie del terreno (m²)')).toBeInTheDocument();
    expect(field('Frente (m)')).toBeInTheDocument();
    expect(field('Fondo (m)')).toBeInTheDocument();
    expect(screen.getByText(/no sustituyen la documentación oficial/)).toBeInTheDocument();
    expect(api.getPropertyDimensions).toHaveBeenCalledWith('7');
  });

  it('CA2: oculta los campos de construcción hasta que se indica que existe', async () => {
    const user = userEvent.setup();
    renderPage();
    await ready();

    expect(screen.queryByLabelText('Superficie construida (m²)')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('No, es solo terreno'));
    expect(screen.queryByLabelText('Superficie construida (m²)')).not.toBeInTheDocument();
  });

  it('CA3: al activar construcción muestra los campos propios de la edificación', async () => {
    const user = userEvent.setup();
    renderPage();
    await ready();

    await user.click(screen.getByLabelText('Sí, tiene construcción'));

    for (const label of [
      'Superficie construida (m²)',
      'Pisos',
      'Habitaciones',
      'Baños',
      'Estacionamientos',
      'Antigüedad (años)',
      'Estado general',
    ]) {
      expect(field(label)).toBeInTheDocument();
    }
  });

  it('CA4: marca los campos inválidos, explica el motivo y bloquea el envío', async () => {
    const user = userEvent.setup();
    renderPage();
    await ready();

    await user.type(field('Superficie del terreno (m²)'), '-5');
    await user.type(field('Frente (m)'), '0');
    await user.type(field('Fondo (m)'), 'abc');
    await user.click(screen.getByLabelText('Sí, tiene construcción'));
    await user.type(field('Habitaciones'), '-1');
    await user.click(screen.getByRole('button', { name: 'Guardar dimensiones' }));

    expect(await screen.findByText('Revisa los campos marcados')).toBeInTheDocument();
    expect(field('Superficie del terreno (m²)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getAllByText('No se permiten valores negativos.').length).toBeGreaterThan(0);
    expect(screen.getByText('El valor debe ser mayor que cero.')).toBeInTheDocument();
    expect(screen.getByText(/Ingresa solo un número/)).toBeInTheDocument();
    expect(api.savePropertyDimensions).not.toHaveBeenCalled();
  });

  it('CA1: guarda un terreno válido, confirma y muestra las medidas asociadas', async () => {
    const user = userEvent.setup();
    const stored = { landArea: 250, frontage: 10, depth: 25, hasConstruction: false };
    api.savePropertyDimensions.mockResolvedValue({
      message: 'Dimensiones guardadas.',
      dimensions: stored,
    });
    renderPage();
    await ready();

    expect(
      screen.getByText('Aún no has guardado las dimensiones de esta propiedad.'),
    ).toBeInTheDocument();

    await user.type(field('Superficie del terreno (m²)'), '250');
    await user.type(field('Frente (m)'), '10');
    await user.type(field('Fondo (m)'), '25');
    await user.click(screen.getByLabelText('No, es solo terreno'));
    await user.click(screen.getByRole('button', { name: 'Guardar dimensiones' }));

    expect(await screen.findByText('Dimensiones guardadas.')).toBeInTheDocument();
    expect(api.savePropertyDimensions).toHaveBeenCalledWith(
      '7',
      expect.objectContaining({
        landArea: 250,
        frontage: 10,
        depth: 25,
        hasConstruction: false,
        builtArea: null,
      }),
    );
    expect(screen.getByText('Medidas registradas')).toBeInTheDocument();
    expect(screen.getByText('250 m²')).toBeInTheDocument();
    expect(screen.getByText('10 m')).toBeInTheDocument();
  });

  it('precarga los datos existentes para editarlos', async () => {
    api.getPropertyDimensions.mockResolvedValue(STORED);
    renderPage();
    await ready();

    expect(field('Superficie del terreno (m²)')).toHaveValue('250');
    expect(field('Sí, tiene construcción')).toBeChecked();
    expect(field('Habitaciones')).toHaveValue('3');
    expect(field('Estado general')).toHaveValue('good');
    expect(screen.getByText('Bueno', { selector: 'dd' })).toBeInTheDocument();
  });

  it('muestra los errores que devuelve el backend en su campo', async () => {
    const user = userEvent.setup();
    api.getPropertyDimensions.mockResolvedValue(STORED);
    api.savePropertyDimensions.mockRejectedValue(
      Object.assign(new Error('Los datos enviados no son válidos.'), {
        status: 400,
        details: { errors: [{ field: 'builtArea', message: 'Superficie inconsistente.' }] },
      }),
    );
    renderPage();
    await ready();

    await user.clear(field('Fondo (m)'));
    await user.type(field('Fondo (m)'), '30');
    await user.click(screen.getByRole('button', { name: 'Guardar dimensiones' }));

    expect(await screen.findByText('Superficie inconsistente.')).toBeInTheDocument();
    expect(screen.getByText('Los datos enviados no son válidos.')).toBeInTheDocument();
  });

  it('si falla la carga muestra el error y permite reintentar', async () => {
    const user = userEvent.setup();
    api.estimationService.getMyProperty.mockRejectedValueOnce(new Error('No tienes permiso.'));
    renderPage();

    expect(await screen.findByText('No tienes permiso.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Terreno' })).toBeInTheDocument(),
    );
  });
});

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api';
import PropertyLocationPage from '@/pages/PropertyLocation/PropertyLocationPage';
import { buildPropertyLocationPath, ROUTES } from '@/utils/constants';
import { renderWithSession } from './renderWithSession';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getMyProperty: vi.fn(),
  getPropertyLocation: vi.fn(),
  savePropertyLocation: vi.fn(),
  getNearbyPlaceCategories: vi.fn(),
  getNearbyPlaces: vi.fn(),
  createNearbyPlace: vi.fn(),
  deleteNearbyPlace: vi.fn(),
}));

const PROPERTY = { id: '7', title: 'Casa en Tula' };

const LOCATION = {
  id: '3',
  propertyId: '7',
  street: 'Av. Juárez 10',
  exteriorNumber: null,
  interiorNumber: null,
  neighborhood: 'Centro',
  municipality: 'Tula de Allende',
  state: 'Hidalgo',
  postalCode: '42800',
  country: 'México',
  latitude: 20.0346,
  longitude: -99.2119,
  formattedAddress: null,
};

const CATEGORIES = [
  { id: 1, name: 'Hospital', isActive: true },
  { id: 2, name: 'Escuela', isActive: true },
];

const PLACES = [
  {
    id: '10',
    propertyId: '7',
    category: { id: 1, name: 'Hospital' },
    name: 'Hospital General',
    approximateDistanceM: 650,
  },
];

function renderPage() {
  return renderWithSession(
    [{ path: ROUTES.PROPERTY_LOCATION, element: <PropertyLocationPage /> }],
    { path: buildPropertyLocationPath(7) },
  );
}

const saveButton = () =>
  within(streetInput().closest('form')).getByRole('button', {
    name: /Guardar ubicación|Guardando|Reintentar/,
  });
const streetInput = () => screen.getByLabelText('Calle');
const latitudeInput = () => screen.getByLabelText('Latitud');

async function ready() {
  await screen.findByLabelText('Calle');
}

beforeEach(() => {
  api.getMyProperty.mockReset().mockResolvedValue(PROPERTY);
  api.getPropertyLocation.mockReset().mockResolvedValue(LOCATION);
  api.savePropertyLocation.mockReset();
  api.getNearbyPlaceCategories.mockReset().mockResolvedValue(CATEGORIES);
  api.getNearbyPlaces.mockReset().mockResolvedValue(PLACES);
  api.createNearbyPlace.mockReset();
  api.deleteNearbyPlace.mockReset();
});

describe('HU-023 · Ubicación y entorno de la propiedad', () => {
  it('arma la ruta de la sección', () => {
    expect(buildPropertyLocationPath(7)).toBe('/mis-propiedades/7/ubicacion');
  });

  it('precarga la ubicación y los puntos cercanos del backend, con los servicios consultados', async () => {
    const user = userEvent.setup();
    renderPage();
    await ready();
    await screen.findByText('Hospital General');

    expect(streetInput()).toHaveValue('Av. Juárez 10');
    expect(screen.getByLabelText('Municipio o localidad')).toHaveValue('Tula de Allende');
    expect(latitudeInput()).toHaveValue('20.0346');
    expect(api.getPropertyLocation).toHaveBeenCalledWith('7');
    expect(api.getNearbyPlaces).toHaveBeenCalledWith('7');
    expect(api.getNearbyPlaceCategories).toHaveBeenCalled();
    expect(screen.getByText('650 m aprox.')).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
    await user.click(saveButton());
    expect(api.savePropertyLocation).not.toHaveBeenCalled();
  });

  it('muestra el punto guardado, las coordenadas resumidas y el texto declarativo de una sola ubicación', async () => {
    renderPage();
    await ready();

    expect(screen.getByText('Tula de Allende, Hidalgo')).toBeInTheDocument();
    expect(screen.getByTestId('coordinates-summary')).toHaveTextContent('20.0346, -99.2119');
    expect(screen.getByText(/una sola ubicación principal/)).toBeInTheDocument();
  });

  it('muestra el bloque de "mapa no disponible" sin pedir API key', async () => {
    renderPage();
    await ready();

    expect(
      screen.getByText('Mapa no disponible actualmente. Puedes registrar la ubicación manualmente.'),
    ).toBeInTheDocument();
  });

  it('sin coordenadas guardadas no resume el punto (pero nunca impide guardar)', async () => {
    api.getPropertyLocation.mockResolvedValue({ ...LOCATION, latitude: null, longitude: null });
    renderPage();
    await ready();

    expect(screen.queryByTestId('coordinates-summary')).not.toBeInTheDocument();
    expect(
      screen.getByText('Mapa no disponible actualmente. Puedes registrar la ubicación manualmente.'),
    ).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay puntos cercanos', async () => {
    api.getNearbyPlaces.mockResolvedValue([]);
    renderPage();
    await ready();

    expect(
      await screen.findByText('No hay puntos de interés cercanos registrados.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Puntos cercanos registrados' })).not.toBeInTheDocument();
    expect(screen.queryByText(/aprox\./)).not.toBeInTheDocument();
  });

  it('registra un punto cercano con las categorías del backend y muestra la distancia aproximada', async () => {
    api.getNearbyPlaces.mockResolvedValue([]);
    const user = userEvent.setup();
    api.createNearbyPlace.mockResolvedValue({
      message: 'Punto cercano agregado correctamente.',
      nearbyPlace: {
        id: '11',
        propertyId: '7',
        category: { id: 2, name: 'Escuela' },
        name: 'Escuela Benito Juárez',
        approximateDistanceM: 1400,
      },
    });
    renderPage();
    await ready();

    await user.selectOptions(await screen.findByLabelText('Categoría'), '2');
    await user.type(screen.getByLabelText('Nombre del punto'), 'Escuela Benito Juárez');
    await user.type(screen.getByLabelText('Distancia aproximada (m)'), '1400');
    await user.click(screen.getByRole('button', { name: 'Agregar punto' }));

    expect(api.createNearbyPlace).toHaveBeenCalledWith('7', {
      categoryId: '2',
      name: 'Escuela Benito Juárez',
      approximateDistanceM: 1400,
    });
    expect(await screen.findByText('Punto cercano agregado correctamente.')).toBeInTheDocument();
    const row = await screen.findByText('Escuela Benito Juárez');
    const rowElement = row.closest('li');
    expect(within(rowElement).getByText('Escuela')).toBeInTheDocument();
    expect(within(rowElement).getByText('1.4 km aprox.')).toBeInTheDocument();
  });

  it('elimina un punto cercano tras confirmar en el diálogo', async () => {
    const user = userEvent.setup();
    api.deleteNearbyPlace.mockResolvedValue({ message: 'Punto cercano eliminado correctamente.' });
    renderPage();
    await ready();

    await user.click(await screen.findByRole('button', { name: 'Eliminar Hospital General' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('¿Eliminar «Hospital General»?');

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    expect(api.deleteNearbyPlace).toHaveBeenCalledWith('7', '10');
    await waitFor(() =>
      expect(screen.queryByText('Hospital General')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Punto cercano eliminado correctamente.')).toBeInTheDocument();
  });

  it('valida coordenadas incompletas (solo latitud) y no llama al backend', async () => {
    const user = userEvent.setup();
    renderPage();
    await ready();

    await user.clear(latitudeInput());
    await user.type(latitudeInput(), '20.0346');
    await user.clear(screen.getByLabelText('Longitud'));
    await user.click(saveButton());

    const errors = await screen.findAllByText('La latitud y longitud deben enviarse juntas.');
    expect(errors.length).toBeGreaterThan(0);
    expect(api.savePropertyLocation).not.toHaveBeenCalled();
  });

  it('valida coordenadas fuera de rango', async () => {
    const user = userEvent.setup();
    api.getPropertyLocation.mockResolvedValue({ ...LOCATION, latitude: null, longitude: null });
    renderPage();
    await ready();

    await user.type(latitudeInput(), '95');
    await user.type(screen.getByLabelText('Longitud'), '-200');
    await user.click(saveButton());

    expect(await screen.findByText('La latitud debe estar entre -90 y 90.')).toBeInTheDocument();
    expect(screen.getByText('La longitud debe estar entre -180 y 180.')).toBeInTheDocument();
    expect(api.savePropertyLocation).not.toHaveBeenCalled();
  });

  it('valida ubicación insuficiente cuando no hay ninguna vía de información', async () => {
    const user = userEvent.setup();
    api.getPropertyLocation.mockResolvedValue(null);
    renderPage();
    await ready();

    await user.click(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(/dirección.*coordenadas/i);
    expect(api.savePropertyLocation).not.toHaveBeenCalled();
  });

  it('guarda la ubicación manual, actualiza el punto y muestra el éxito sin recargar la página', async () => {
    const user = userEvent.setup();
    api.savePropertyLocation.mockResolvedValue({
      message: 'Ubicación guardada correctamente.',
      location: {
        ...LOCATION,
        street: 'Av. Juárez 99',
        formattedAddress: null,
        latitude: null,
        longitude: null,
      },
    });
    renderPage();
    await ready();

    await user.clear(streetInput());
    await user.type(streetInput(), 'Av. Juárez 99');
    await user.clear(latitudeInput());
    await user.clear(screen.getByLabelText('Longitud'));
    expect(saveButton()).toBeEnabled();

    await user.click(saveButton());
    expect(api.savePropertyLocation).toHaveBeenCalledWith('7', {
      street: 'Av. Juárez 99',
      neighborhood: 'Centro',
      municipality: 'Tula de Allende',
      state: 'Hidalgo',
      postalCode: '42800',
      country: 'México',
    });
    expect(await screen.findByText('Ubicación guardada correctamente.')).toBeInTheDocument();
    expect(screen.queryByTestId('coordinates-summary')).not.toBeInTheDocument();
    expect(streetInput()).toHaveValue('Av. Juárez 99');
    expect(saveButton()).toBeEnabled();
  });

  it('evita el doble envío mientras se guarda', async () => {
    const user = userEvent.setup();
    api.savePropertyLocation.mockImplementation(() => new Promise(() => {}));
    renderPage();
    await ready();

    await user.clear(streetInput());
    await user.type(streetInput(), 'Av. Juárez 99');
    await user.dblClick(saveButton());

    expect(api.savePropertyLocation).toHaveBeenCalledTimes(1);
    expect(saveButton()).toBeDisabled();
  });

  it('si el guardado falla (400) muestra los errores del backend y conserva lo escrito', async () => {
    const user = userEvent.setup();
    api.savePropertyLocation.mockRejectedValue(
      Object.assign(new Error('Los datos enviados no son válidos.'), {
        status: 400,
        details: {
          message: 'La ubicación no es válida.',
          errors: [{ field: 'state', message: 'El estado es obligatorio con municipio.' }],
        },
      }),
    );
    renderPage();
    await ready();

    await user.clear(streetInput());
    await user.type(streetInput(), 'Calle Nueva');
    await user.click(saveButton());

    expect(await screen.findByText('La ubicación no es válida.')).toBeInTheDocument();
    expect(screen.getByText('El estado es obligatorio con municipio.')).toBeInTheDocument();
    expect(screen.getByLabelText('Estado')).toHaveAttribute('aria-invalid', 'true');
    expect(streetInput()).toHaveValue('Calle Nueva');
    expect(screen.getByLabelText('Estado')).toHaveValue('Hidalgo');
    expect(saveButton()).toHaveTextContent('Reintentar');
    expect(saveButton()).toBeEnabled();
  });

  it('un error de red o 500 conserva lo escrito y muestra el mensaje general', async () => {
    const user = userEvent.setup();
    api.savePropertyLocation.mockRejectedValue(
      Object.assign(new Error('Ocurrió un problema en el servidor.'), { status: 500 }),
    );
    renderPage();
    await ready();

    await user.clear(streetInput());
    await user.type(streetInput(), 'Calle Nueva');
    await user.click(saveButton());

    expect(
      await screen.findByText('Ocurrió un problema en el servidor.'),
    ).toBeInTheDocument();
    expect(streetInput()).toHaveValue('Calle Nueva');
  });

  it('los puntos cercanos conservan lo escrito si la creación falla', async () => {
    const user = userEvent.setup();
    api.getNearbyPlaces.mockResolvedValue([]);
    api.createNearbyPlace.mockRejectedValue(
      Object.assign(new Error('Los datos del punto cercano no son válidos.'), {
        status: 400,
        details: { message: 'El nombre ya está registrado en esta propiedad.' },
      }),
    );
    renderPage();
    await ready();

    await user.selectOptions(await screen.findByLabelText('Categoría'), '1');
    await user.type(screen.getByLabelText('Nombre del punto'), 'Hospital General');
    await user.type(screen.getByLabelText('Distancia aproximada (m)'), '650');
    await user.click(screen.getByRole('button', { name: 'Agregar punto' }));

    expect(
      await screen.findByText('El nombre ya está registrado en esta propiedad.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre del punto')).toHaveValue('Hospital General');
    expect(screen.getByLabelText('Distancia aproximada (m)')).toHaveValue('650');
  });

  it('si falla la eliminación, el diálogo muestra el error y el punto sigue en la lista', async () => {
    const user = userEvent.setup();
    api.deleteNearbyPlace.mockRejectedValue(
      Object.assign(new Error('El punto cercano no fue encontrado.'), {
        status: 404,
        details: { message: 'El punto cercano no fue encontrado.' },
      }),
    );
    renderPage();
    await ready();

    await user.click(await screen.findByRole('button', { name: 'Eliminar Hospital General' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    expect(await within(dialog).findByText('El punto cercano no fue encontrado.')).toBeInTheDocument();
    expect(screen.getByText('Hospital General')).toBeInTheDocument();
  });

  it('carga las categorías desde la API, sin listas hardcodeadas', async () => {
    renderPage();
    await ready();

    const select = await screen.findByLabelText('Categoría');
    expect(select).toContainHTML('Hospital');
    expect(select).toContainHTML('Escuela');
    expect(select).not.toContainHTML('Supermercado');
  });

  it('si el catálogo de categorías falla, permite reintentar sin perder la página', async () => {
    const user = userEvent.setup();
    api.getNearbyPlaceCategories
      .mockRejectedValueOnce(Object.assign(new Error('Sin conexión'), { status: null }))
      .mockResolvedValueOnce(CATEGORIES);
    renderPage();
    await ready();

    const categoriesError = await screen.findByText('No pudimos cargar las categorías');
    expect(categoriesError).toBeInTheDocument();

    const categoriesForm = within(categoriesError.closest('form'));
    await user.click(categoriesForm.getByRole('button', { name: 'Reintentar' }));
    expect(await categoriesForm.findByLabelText('Categoría')).toContainHTML('Hospital');
    expect(api.getNearbyPlaceCategories).toHaveBeenCalledTimes(2);
  });

  it('si la carga falla con 403, muestra acceso denegado sin exponer la propiedad', async () => {
    api.getMyProperty.mockRejectedValue(Object.assign(new Error('Sin permiso'), { status: 403 }));
    renderPage();

    expect(
      await screen.findByText('No puedes administrar la ubicación de esta propiedad porque no te pertenece.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Calle')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('si la carga falla con 404, indica que la propiedad no está disponible', async () => {
    api.getMyProperty.mockRejectedValue(Object.assign(new Error('No encontrada'), { status: 404 }));
    renderPage();

    expect(
      await screen.findByText('No encontramos esta propiedad. Puede que ya no exista o que no sea tuya.'),
    ).toBeInTheDocument();
  });

  it('ante un error de red permite reintentar la carga', async () => {
    const user = userEvent.setup();
    api.getMyProperty
      .mockRejectedValueOnce(Object.assign(new Error('Sin conexión'), { status: null }))
      .mockResolvedValueOnce(PROPERTY);
    renderPage();

    expect(await screen.findByText('No pudimos cargar la ubicación')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByLabelText('Calle')).toBeInTheDocument();
  });
});

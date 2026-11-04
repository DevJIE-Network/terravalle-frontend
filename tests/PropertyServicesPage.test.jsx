import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api';
import PropertyServicesPage from '@/pages/PropertyServices/PropertyServicesPage';
import { buildPropertyServicesPath, ROUTES } from '@/utils/constants';
import { renderWithSession } from './renderWithSession';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getMyProperty: vi.fn(),
  getServiceCatalog: vi.fn(),
  getPropertyServices: vi.fn(),
  savePropertyServices: vi.fn(),
}));

const PROPERTY = { id: '7', title: 'Casa en Tula' };

const CATALOG = [
  { id: 1, name: 'Agua potable', description: null },
  { id: 2, name: 'Electricidad', description: null },
  { id: 3, name: 'Drenaje', description: null },
  { id: 4, name: 'Gas', description: null },
  { id: 5, name: 'Internet', description: null },
  { id: 6, name: 'Alumbrado público', description: null },
  { id: 7, name: 'Pavimentación', description: null },
  { id: 8, name: 'Banqueta', description: 'Acceso peatonal frente al inmueble' },
];

const byId = (...ids) => CATALOG.filter((service) => ids.includes(service.id));

function renderPage() {
  return renderWithSession(
    [{ path: ROUTES.PROPERTY_SERVICES, element: <PropertyServicesPage /> }],
    { path: buildPropertyServicesPath(7) },
  );
}

async function ready() {
  return screen.findByRole('heading', { name: 'Servicios disponibles' });
}

const checkbox = (name) => screen.getByRole('checkbox', { name: new RegExp(`^${name}`) });
const saveButton = () => screen.getByRole('button', { name: /Guardar servicios|Reintentar/ });
const summary = () => screen.queryByRole('list', { name: 'Servicios registrados' });

beforeEach(() => {
  api.getMyProperty.mockReset().mockResolvedValue(PROPERTY);
  api.getServiceCatalog.mockReset().mockResolvedValue(CATALOG);
  api.getPropertyServices.mockReset().mockResolvedValue([]);
  api.savePropertyServices.mockReset();
});

describe('HU-022 · Selección de servicios de la propiedad', () => {
  it('arma la ruta de la sección', () => {
    expect(buildPropertyServicesPath(7)).toBe('/mis-propiedades/7/servicios');
  });

  it('muestra el catálogo completo con casillas y la leyenda declarativa', async () => {
    renderPage();
    await ready();

    expect(screen.getAllByRole('checkbox')).toHaveLength(8);
    expect(checkbox('Alumbrado público')).not.toBeChecked();
    expect(screen.getByText('Acceso peatonal frente al inmueble')).toBeInTheDocument();
    expect(screen.getByText(/no certifica su disponibilidad/)).toBeInTheDocument();
    expect(screen.getByText(/«Casa en Tula»/)).toBeInTheDocument();
    expect(api.getPropertyServices).toHaveBeenCalledWith('7');
  });

  it('CA1: guarda los servicios marcados y muestra la confirmación', async () => {
    const user = userEvent.setup();
    api.savePropertyServices.mockResolvedValue({
      message: 'Servicios de la propiedad guardados correctamente.',
      services: byId(1, 2),
    });
    renderPage();
    await ready();

    expect(saveButton()).toBeDisabled();
    await user.click(checkbox('Electricidad'));
    await user.click(checkbox('Agua potable'));
    expect(screen.getByText('2 seleccionados')).toBeInTheDocument();
    await user.click(saveButton());

    // Se envían en el orden del catálogo, sin texto libre.
    expect(api.savePropertyServices).toHaveBeenCalledWith('7', [1, 2]);
    expect(
      await screen.findByText('Servicios de la propiedad guardados correctamente.'),
    ).toBeInTheDocument();
    expect(within(summary()).getByText('Agua potable')).toBeInTheDocument();
    expect(within(summary()).getByText('Electricidad')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('CA2: al desmarcar un servicio guardado, refleja el nuevo estado', async () => {
    const user = userEvent.setup();
    api.getPropertyServices.mockResolvedValue(byId(1, 4));
    api.savePropertyServices.mockResolvedValue({ services: byId(1) });
    renderPage();
    await ready();

    expect(within(summary()).getByText('Gas')).toBeInTheDocument();
    await user.click(checkbox('Gas'));
    await user.click(saveButton());

    expect(api.savePropertyServices).toHaveBeenCalledWith('7', [1]);
    await waitFor(() => expect(within(summary()).queryByText('Gas')).not.toBeInTheDocument());
    expect(checkbox('Gas')).not.toBeChecked();
    expect(screen.getByText('Los servicios se guardaron correctamente.')).toBeInTheDocument();
  });

  it('CA2: permite quitar todos los servicios', async () => {
    const user = userEvent.setup();
    api.getPropertyServices.mockResolvedValue(byId(5));
    api.savePropertyServices.mockResolvedValue({ services: [] });
    renderPage();
    await ready();

    await user.click(checkbox('Internet'));
    await user.click(saveButton());

    expect(api.savePropertyServices).toHaveBeenCalledWith('7', []);
    expect(await screen.findByText(/aún no tiene servicios registrados/)).toBeInTheDocument();
  });

  it('CA3: al volver a abrir la sección precarga la selección vigente', async () => {
    api.getPropertyServices.mockResolvedValue(byId(2, 7));
    renderPage();
    await ready();

    expect(checkbox('Electricidad')).toBeChecked();
    expect(checkbox('Pavimentación')).toBeChecked();
    expect(checkbox('Drenaje')).not.toBeChecked();
    expect(within(summary()).getAllByRole('listitem')).toHaveLength(2);
  });

  it('marcar y desmarcar el mismo servicio no lo duplica ni deja cambios pendientes', async () => {
    const user = userEvent.setup();
    renderPage();
    await ready();

    await user.click(checkbox('Gas'));
    await user.click(checkbox('Gas'));
    expect(screen.getByText('0 seleccionados')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('CA4: si el guardado falla muestra el error, conserva la selección y permite reintentar', async () => {
    const user = userEvent.setup();
    api.savePropertyServices
      .mockRejectedValueOnce(Object.assign(new Error('Sin conexión'), { status: null }))
      .mockResolvedValueOnce({ services: byId(3) });
    renderPage();
    await ready();

    await user.click(checkbox('Drenaje'));
    await user.click(saveButton());

    expect(await screen.findByText('No se pudieron guardar los servicios')).toBeInTheDocument();
    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
    expect(checkbox('Drenaje')).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(within(summary()).getByText('Drenaje')).toBeInTheDocument());
    expect(api.savePropertyServices).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('No se pudieron guardar los servicios')).not.toBeInTheDocument();
  });

  it('CA4: muestra el mensaje del backend cuando rechaza la selección', async () => {
    const user = userEvent.setup();
    api.savePropertyServices.mockRejectedValue(
      Object.assign(new Error('Los datos enviados no son válidos.'), {
        status: 400,
        details: { message: 'Uno o más servicios no existen o no están disponibles.' },
      }),
    );
    renderPage();
    await ready();

    await user.click(checkbox('Banqueta'));
    await user.click(saveButton());

    expect(
      await screen.findByText('Uno o más servicios no existen o no están disponibles.'),
    ).toBeInTheDocument();
    expect(checkbox('Banqueta')).toBeChecked();
  });

  it('CA4: si el catálogo no carga, muestra el error y permite reintentar', async () => {
    const user = userEvent.setup();
    api.getServiceCatalog
      .mockRejectedValueOnce(Object.assign(new Error('El servidor no responde'), { status: 500 }))
      .mockResolvedValueOnce(CATALOG);
    renderPage();

    expect(await screen.findByText('No pudimos cargar los servicios')).toBeInTheDocument();
    expect(screen.getByText('El servidor no responde')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await ready();
    expect(screen.getAllByRole('checkbox')).toHaveLength(8);
  });

  it('solo el responsable puede editar: sin acceso no muestra la selección', async () => {
    api.getMyProperty.mockRejectedValue(Object.assign(new Error('No encontrado'), { status: 404 }));
    renderPage();

    expect(
      await screen.findByText('No puedes editar los servicios de esta propiedad'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('avisa si el catálogo está vacío', async () => {
    api.getServiceCatalog.mockResolvedValue([]);
    renderPage();
    await ready();

    expect(screen.getByText(/no tiene opciones disponibles/)).toBeInTheDocument();
  });
});

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { estimationService } from '@/api';
import PropertyEstimationPage from '@/pages/PropertyEstimation/PropertyEstimationPage';
import { buildPropertyEstimationPath, ROUTES } from '@/utils/constants';
import { renderWithSession } from './renderWithSession';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  estimationService: {
    getMyProperty: vi.fn(),
    getEstimations: vi.fn(),
    requestEstimation: vi.fn(),
    updatePublicationPrice: vi.fn(),
  },
}));

const PROPERTY = {
  id: '7',
  title: 'Casa en Tula',
  publicationPrice: 1500000,
  status: 'draft',
};

const ESTIMATION = {
  id: '15',
  propertyId: '7',
  estimatedValue: 1757000,
  estimatedMin: 1511000,
  estimatedMax: 2003000,
  explanation: 'Valor orientativo calculado con los datos de la propiedad.',
  modelName: 'terravalle-valuador',
  modelVersion: '1.1.0',
  createdAt: '2026-10-28T12:00:00.000Z',
  disclaimer: 'Estimación orientativa. No es un avalúo oficial.',
  factors: [
    {
      name: 'Ubicación',
      value: 'Tula de Allende, Hidalgo',
      impact: 'negative',
      explanation: 'Zona con precio menor.',
    },
    { name: 'Construcción', value: '120 m²', impact: 'positive', explanation: 'Aporta valor.' },
    { name: 'Entorno', value: 'Sin puntos', impact: 'neutral', explanation: 'Sin ajuste.' },
  ],
};

const apiError = (status, details, message = 'Error') =>
  Object.assign(new Error(message), { status, details });

function renderPage() {
  return renderWithSession(
    [{ path: ROUTES.PROPERTY_ESTIMATION, element: <PropertyEstimationPage /> }],
    {
      path: buildPropertyEstimationPath(7),
    },
  );
}

const money = (text) =>
  screen.getAllByText((content) => content.replace(/\s/g, ' ').includes(text));

beforeEach(() => {
  estimationService.getMyProperty.mockReset().mockResolvedValue(PROPERTY);
  estimationService.getEstimations.mockReset().mockResolvedValue({ estimations: [] });
  estimationService.requestEstimation.mockReset();
  estimationService.updatePublicationPrice.mockReset();
});

describe('HU-009 · Estimación del valor', () => {
  it('arma la ruta de la estimación de una propiedad', () => {
    expect(buildPropertyEstimationPath(7)).toBe('/mis-propiedades/7/estimacion');
  });

  it('carga la propiedad y muestra que aún no hay estimaciones', async () => {
    renderPage();

    expect(screen.getByText('Cargando la propiedad...')).toBeInTheDocument();
    expect(await screen.findByText('Aún no hay estimaciones')).toBeInTheDocument();
    expect(screen.getByText(/«Casa en Tula»/)).toBeInTheDocument();
    expect(estimationService.getMyProperty).toHaveBeenCalledWith('7');
    expect(estimationService.getEstimations).toHaveBeenCalledWith('7');
  });

  it('si falla la carga muestra el error y permite reintentar', async () => {
    const user = userEvent.setup();
    estimationService.getMyProperty.mockRejectedValueOnce(new Error('No tienes permiso.'));
    renderPage();

    expect(await screen.findByText('No pudimos cargar la propiedad')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Aún no hay estimaciones')).toBeInTheDocument();
  });

  it('CA1 CA3 muestra el valor, el rango, los factores y la advertencia', async () => {
    const user = userEvent.setup();
    estimationService.requestEstimation.mockResolvedValue({ estimation: ESTIMATION });
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Estimar valor con IA' }));

    expect(estimationService.requestEstimation).toHaveBeenCalledWith('7');
    expect(await screen.findByText('Valor orientativo estimado')).toBeInTheDocument();
    expect(money('1,757,000').length).toBeGreaterThan(0);
    expect(money('1,511,000').length).toBeGreaterThan(0);
    expect(money('2,003,000').length).toBeGreaterThan(0);
    expect(screen.getByText(ESTIMATION.explanation)).toBeInTheDocument();
    expect(
      screen.getByText('Estimación orientativa. No es un avalúo oficial.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/versión 1\.1\.0/)).toBeInTheDocument();
    expect(screen.getByText('Aumenta el valor')).toBeInTheDocument();
    expect(screen.getByText('Reduce el valor')).toBeInTheDocument();
    expect(screen.getByText('Sin efecto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver a estimar' })).toBeInTheDocument();
  });

  it('CA2 si faltan datos muestra qué información completar', async () => {
    const user = userEvent.setup();
    estimationService.requestEstimation.mockRejectedValue(
      apiError(422, {
        missing: [
          {
            field: 'characteristics',
            section: 'Dimensiones y construcción',
            message: 'Registra la superficie.',
          },
          {
            field: 'location',
            section: 'Ubicación',
            message: 'Registra el municipio y el estado.',
          },
        ],
      }),
    );
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Estimar valor con IA' }));

    const alert = await screen.findByText('Completa la información de la propiedad');
    const box = alert.closest('[role="alert"]');
    expect(within(box).getByText('Registra la superficie.')).toBeInTheDocument();
    expect(within(box).getByText('Registra el municipio y el estado.')).toBeInTheDocument();
    expect(screen.getByText('Aún no hay estimaciones')).toBeInTheDocument();
  });

  it('otros errores se muestran en un aviso que se puede cerrar', async () => {
    const user = userEvent.setup();
    estimationService.requestEstimation
      .mockRejectedValueOnce(apiError(409, { message: 'La propiedad está retirada.' }))
      .mockRejectedValueOnce(apiError(500, null, 'Error del servidor.'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Estimar valor con IA' }));
    expect(await screen.findByText('La propiedad está retirada.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Estimar valor con IA' }));
    expect(await screen.findByText('Error del servidor.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByText('Error del servidor.')).not.toBeInTheDocument();
  });

  it('una propiedad retirada no se puede estimar', async () => {
    estimationService.getMyProperty.mockResolvedValue({ ...PROPERTY, status: 'withdrawn' });
    renderPage();

    expect(await screen.findByRole('button', { name: 'Estimar valor con IA' })).toBeDisabled();
    expect(
      screen.getByText('Esta propiedad está retirada y no se puede estimar.'),
    ).toBeInTheDocument();
  });

  it('muestra el historial de estimaciones anteriores', async () => {
    estimationService.getEstimations.mockResolvedValue({
      estimations: [
        ESTIMATION,
        { ...ESTIMATION, id: '14', estimatedValue: 1600000, createdAt: '2026-10-20T10:00:00.000Z' },
      ],
    });
    renderPage();

    expect(await screen.findByText('Estimaciones anteriores')).toBeInTheDocument();
    expect(money('1,600,000').length).toBeGreaterThan(0);
  });
});

describe('HU-009 CA4 · Precio final de publicación', () => {
  it('permite conservar un precio distinto al valor sugerido', async () => {
    const user = userEvent.setup();
    estimationService.getEstimations.mockResolvedValue({ estimations: [ESTIMATION] });
    estimationService.updatePublicationPrice.mockResolvedValue({
      ...PROPERTY,
      publicationPrice: 1650000,
    });
    renderPage();

    const input = await screen.findByLabelText('Precio final (MXN)');
    expect(input).toHaveValue(1500000);
    expect(screen.getByRole('button', { name: 'Guardar precio' })).toBeDisabled();

    await user.clear(input);
    await user.type(input, '1650000');
    await user.click(screen.getByRole('button', { name: 'Guardar precio' }));

    expect(estimationService.updatePublicationPrice).toHaveBeenCalledWith('7', 1650000);
    expect(await screen.findByText('Precio de publicación actualizado.')).toBeInTheDocument();
    expect(money('1,650,000').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByText('Precio de publicación actualizado.')).not.toBeInTheDocument();
  });

  it('puede usar el valor estimado como precio o dejarlo sin definir', async () => {
    const user = userEvent.setup();
    estimationService.getEstimations.mockResolvedValue({ estimations: [ESTIMATION] });
    estimationService.updatePublicationPrice.mockImplementation(async (id, publicationPrice) => ({
      ...PROPERTY,
      publicationPrice,
    }));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Usar valor estimado/ }));
    expect(screen.getByLabelText('Precio final (MXN)')).toHaveValue(1757000);
    await user.click(screen.getByRole('button', { name: 'Guardar precio' }));
    expect(estimationService.updatePublicationPrice).toHaveBeenLastCalledWith('7', 1757000);

    await user.clear(await screen.findByLabelText('Precio final (MXN)'));
    await user.click(screen.getByRole('button', { name: 'Guardar precio' }));
    expect(estimationService.updatePublicationPrice).toHaveBeenLastCalledWith('7', null);
    expect(await screen.findByText('Sin definir')).toBeInTheDocument();
  });

  it('valida el precio y muestra los errores del backend', async () => {
    const user = userEvent.setup();
    estimationService.updatePublicationPrice
      .mockRejectedValueOnce(
        apiError(400, { errors: [{ field: 'publicationPrice', message: 'Máximo 2 decimales.' }] }),
      )
      .mockRejectedValueOnce(apiError(500, null, 'Error del servidor.'));
    renderPage();

    const input = await screen.findByLabelText('Precio final (MXN)');
    await user.clear(input);
    await user.type(input, '-5');
    await user.click(screen.getByRole('button', { name: 'Guardar precio' }));
    expect(screen.getByText('Ingresa un precio válido, mayor o igual a cero.')).toBeInTheDocument();
    expect(estimationService.updatePublicationPrice).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, '1500000.555');
    await user.click(screen.getByRole('button', { name: 'Guardar precio' }));
    expect(await screen.findByText('Máximo 2 decimales.')).toBeInTheDocument();

    await user.type(input, '1');
    await user.click(screen.getByRole('button', { name: 'Guardar precio' }));
    expect(await screen.findByText('Error del servidor.')).toBeInTheDocument();
  });
});

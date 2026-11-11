import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as api from '@/api';
import App from '@/App';
import { ROUTES, STORAGE_KEYS } from '@/utils/constants';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getPublicProperties: vi.fn(),
}));

describe('HU-026 · rutas públicas reales', () => {
  it('abre el catálogo y navega con teclado desde una tarjeta al punto de integración público, sin login', async () => {
    const user = userEvent.setup();
    api.getPublicProperties.mockResolvedValue({
      properties: [{ id: 7, title: 'Terreno en Tula', propertyType: 'Terreno', landArea: 200 }],
      pagination: {
        page: 1,
        limit: 12,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    render(<App />);
    await user.click(screen.getByRole('link', { name: 'Ver catálogo' }));
    const propertyLink = await screen.findByRole('link', {
      name: 'Ver propiedad: Terreno en Tula',
    });

    expect(window.location.pathname).toBe(ROUTES.CATALOG);
    expect(localStorage.getItem(STORAGE_KEYS.SESSION)).toBeNull();
    expect(propertyLink).toHaveAttribute('href', '/propiedades/7');
    propertyLink.focus();
    expect(propertyLink).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(
      await screen.findByRole('heading', { name: 'Ficha de la propiedad' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/propiedades/7');
    expect(
      screen.getByText('El detalle público estará disponible próximamente'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al catálogo' })).toHaveAttribute(
      'href',
      ROUTES.CATALOG,
    );
    expect(localStorage.getItem(STORAGE_KEYS.SESSION)).toBeNull();
  });
});

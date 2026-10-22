import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Navbar from '@/components/layout/Navbar';
import { confirmDiscardChanges, useUnsavedChanges } from '@/hooks';
import { renderWithSession } from './renderWithSession';

/** Pantalla de prueba con cambios sin guardar. */
function DirtyScreen() {
  useUnsavedChanges(true);
  return <Navbar />;
}

describe('Cerrar sesión con cambios sin guardar (HU-019 CA4)', () => {
  it('sin cambios pendientes cierra sesión sin preguntar', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm');
    const { router } = renderWithSession([{ path: '/perfil', element: <Navbar /> }], {
      path: '/perfil',
    });

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByTestId('session-name')).toHaveTextContent('sin sesión');
    expect(router.state.location.pathname).toBe('/');
  });

  it('con cambios pendientes pide confirmación y respeta la respuesta', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderWithSession([{ path: '/perfil', element: <DirtyScreen /> }], { path: '/perfil' });

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(screen.getByTestId('session-name')).toHaveTextContent('Ana Pérez');

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('session-name')).toHaveTextContent('sin sesión');
  });

  it('confirmDiscardChanges permite continuar si no hay cambios', () => {
    expect(confirmDiscardChanges()).toBe(true);
  });
});

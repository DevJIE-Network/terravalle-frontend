import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '@/components/ui';

function setup(props = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <>
      <button>Abrir</button>
      <ConfirmDialog
        open
        title="¿Retirar esta propiedad?"
        confirmLabel="Retirar"
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      >
        Esta acción es definitiva.
      </ConfirmDialog>
    </>,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('no renderiza nada si está cerrado', () => {
    render(
      <ConfirmDialog open={false} title="x" onConfirm={() => {}} onCancel={() => {}}>
        y
      </ConfirmDialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('es un diálogo modal con título y descripción accesibles', () => {
    setup();
    const dialog = screen.getByRole('dialog', { name: '¿Retirar esta propiedad?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Esta acción es definitiva.');
  });

  it('enfoca "Cancelar" al abrir (la opción segura)', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('confirma y cancela con sus botones', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = setup();

    await user.click(screen.getByRole('button', { name: 'Retirar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Esc cancela', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('mientras carga no se puede cancelar', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup({ loading: true });

    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('Tab no sale del diálogo', async () => {
    const user = userEvent.setup();
    setup();

    // Cancelar → Retirar → (vuelve) Cancelar
    await user.tab();
    expect(screen.getByRole('button', { name: 'Retirar' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Retirar' })).toHaveFocus();
  });

  it('muestra el error y sigue abierto', () => {
    setup({ error: 'La propiedad cambió de estado.' });
    expect(screen.getByRole('alert')).toHaveTextContent('La propiedad cambió de estado.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('al cerrar devuelve el foco a donde estaba', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <>
        <button>Abrir</button>
        <ConfirmDialog open={false} title="t" onConfirm={() => {}} onCancel={() => {}}>
          c
        </ConfirmDialog>
      </>,
    );
    const opener = screen.getByRole('button', { name: 'Abrir' });
    await user.click(opener);

    rerender(
      <>
        <button>Abrir</button>
        <ConfirmDialog open title="t" onConfirm={() => {}} onCancel={() => {}}>
          c
        </ConfirmDialog>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();

    rerender(
      <>
        <button>Abrir</button>
        <ConfirmDialog open={false} title="t" onConfirm={() => {}} onCancel={() => {}}>
          c
        </ConfirmDialog>
      </>,
    );
    expect(opener).toHaveFocus();
  });
});

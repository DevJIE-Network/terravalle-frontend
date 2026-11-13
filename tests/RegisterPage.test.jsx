import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authService from '@/api/auth.service';
import RegisterPage from '@/pages/Register/RegisterPage';
import { renderWithAuth } from './renderWithAuth';

vi.mock('@/api/auth.service', async (importOriginal) => ({
  ...(await importOriginal()),
  register: vi.fn(),
}));

function renderRegister() {
  return renderWithAuth(
    [
      { path: '/registro', element: <RegisterPage /> },
      { path: '/login', element: <p>Pantalla de login</p> },
    ],
    { initialEntries: ['/registro'] },
  );
}

const field = (label) => screen.getByLabelText(label);
const submit = () => screen.getByRole('button', { name: 'Crear cuenta' });

/** Llena el formulario con datos válidos; `overrides` cambia campos puntuales. */
function fill(overrides = {}) {
  const values = {
    Nombre: 'Ana Pérez',
    'Correo electrónico': 'Ana@Correo.com',
    Contraseña: 'secreta123',
    'Confirmar contraseña': 'secreta123',
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(field(label), { target: { value } });
  }
}

beforeEach(() => {
  authService.register.mockReset();
});

describe('HU-017 · Crear cuenta', () => {
  it('marca todos los campos obligatorios sin llamar al backend', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.click(submit());

    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('El correo electrónico es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument();
    expect(screen.getByText('Confirma tu contraseña.')).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it.each([
    [{ Nombre: 'A' }, 'El nombre debe tener al menos 2 caracteres.'],
    [{ Nombre: 'A'.repeat(121) }, 'El nombre no puede superar los 120 caracteres.'],
    [{ 'Correo electrónico': 'ana@correo' }, 'Ingresa un correo electrónico válido.'],
    [
      { Contraseña: 'corta', 'Confirmar contraseña': 'corta' },
      'La contraseña debe tener al menos 8 caracteres.',
    ],
    [
      { Contraseña: 'x'.repeat(73), 'Confirmar contraseña': 'x'.repeat(73) },
      'La contraseña no puede superar los 72 caracteres.',
    ],
    [{ 'Confirmar contraseña': 'otra12345' }, 'Las contraseñas no coinciden.'],
  ])('valida %o', async (overrides, message) => {
    const user = userEvent.setup();
    renderRegister();

    fill(overrides);
    await user.click(submit());

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('limpia el error de un campo al corregirlo', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.click(submit());
    await user.type(field('Nombre'), 'Ana');

    expect(screen.queryByText('El nombre es obligatorio.')).not.toBeInTheDocument();
  });

  it('crea la cuenta sin enviar la confirmación y lleva al login con aviso', async () => {
    const user = userEvent.setup();
    authService.register.mockResolvedValue({ user: { id: 1 } });
    renderRegister();

    fill({ Nombre: '  Ana Pérez  ' });
    await user.click(submit());

    expect(authService.register).toHaveBeenCalledWith({
      name: 'Ana Pérez',
      email: 'ana@correo.com',
      password: 'secreta123',
    });
    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
    expect(screen.getByTestId('message')).toHaveTextContent(
      'Cuenta creada correctamente. Ahora puedes iniciar sesión.',
    );
  });

  it('marca el correo si ya está registrado (409)', async () => {
    const user = userEvent.setup();
    authService.register.mockRejectedValue(Object.assign(new Error('Conflicto'), { status: 409 }));
    renderRegister();

    fill();
    await user.click(submit());

    expect(
      await screen.findByText('Este correo electrónico ya está registrado.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('No se pudo crear la cuenta')).not.toBeInTheDocument();
    expect(submit()).toBeEnabled();
  });

  it('muestra el mensaje del backend en un error general y se puede cerrar', async () => {
    const user = userEvent.setup();
    authService.register.mockRejectedValue(
      Object.assign(new Error('Error'), { status: 500, details: { message: 'Servicio caído' } }),
    );
    renderRegister();

    fill();
    await user.click(submit());

    expect(await screen.findByText('Servicio caído')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(screen.queryByText('Servicio caído')).not.toBeInTheDocument();
  });

  it('usa el mensaje del cliente o uno por defecto', async () => {
    const user = userEvent.setup();
    authService.register
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockRejectedValueOnce(new Error(''));
    renderRegister();

    fill();
    await user.click(submit());
    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();

    await user.click(submit());
    expect(
      await screen.findByText('No fue posible crear la cuenta. Intenta nuevamente.'),
    ).toBeInTheDocument();
  });

  it('muestra las contraseñas y enlaza al login', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.click(screen.getByLabelText('Mostrar contraseña'));
    expect(field('Contraseña')).toHaveAttribute('type', 'text');
    expect(field('Confirmar contraseña')).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('link', { name: 'Iniciar sesión' }));
    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
  });
});

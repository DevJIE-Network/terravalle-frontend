import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userService } from '@/api';
import ProfilePage from '@/pages/Profile/ProfilePage';
import { STORAGE_KEYS } from '@/utils/constants';
import { renderWithSession } from './renderWithSession';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  userService: { getMyProfile: vi.fn(), updateMyProfile: vi.fn() },
}));

const PROFILE = {
  id: '7',
  name: 'Ana Pérez',
  email: 'ana@correo.com',
  phone: '7731234567',
  contactEmail: null,
  createdAt: '2026-09-15T12:00:00.000Z',
};

const field = (label) => screen.getByLabelText(new RegExp(`^${label}`));

function renderProfile() {
  return renderWithSession([{ path: '/perfil', element: <ProfilePage /> }], { path: '/perfil' });
}

async function openEditor(user) {
  renderProfile();
  await user.click(await screen.findByRole('button', { name: 'Editar perfil' }));
}

async function replace(user, label, value) {
  await user.clear(field(label));
  if (value) await user.type(field(label), value);
}

beforeEach(() => {
  userService.getMyProfile.mockReset().mockResolvedValue(PROFILE);
  userService.updateMyProfile.mockReset();
});

describe('HU-019 · Consultar mi perfil', () => {
  it('CA1 muestra los datos del usuario autenticado', async () => {
    renderProfile();

    expect(screen.getByText('Cargando tu perfil...')).toBeInTheDocument();
    expect(await screen.findByText('ana@correo.com')).toBeInTheDocument();
    expect(screen.getByText('7731234567')).toBeInTheDocument();
    expect(screen.getByText('No registrado')).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('muestra "No disponible" si la fecha de registro no existe o no es válida', async () => {
    userService.getMyProfile.mockResolvedValue({ ...PROFILE, createdAt: 'fecha-invalida' });
    renderProfile();
    expect(await screen.findByText('No disponible')).toBeInTheDocument();
  });

  it('si falla la carga muestra el error y permite reintentar', async () => {
    const user = userEvent.setup();
    userService.getMyProfile.mockRejectedValueOnce(new Error('No hay conexión con el servidor.'));
    renderProfile();

    expect(await screen.findByText('No pudimos cargar tu perfil')).toBeInTheDocument();
    expect(screen.getByText('No hay conexión con el servidor.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('ana@correo.com')).toBeInTheDocument();
    expect(userService.getMyProfile).toHaveBeenCalledTimes(2);
  });

  it('ignora la respuesta si el usuario sale antes de que termine la carga', async () => {
    let resolve;
    userService.getMyProfile.mockReturnValue(new Promise((r) => (resolve = r)));
    const { router } = renderProfile();

    await act(() => router.navigate('/'));
    await act(async () => resolve(PROFILE));
    expect(screen.getByText('Página de inicio')).toBeInTheDocument();
  });
});

describe('HU-019 · Actualizar mi perfil', () => {
  it('CA2 guarda solo los cambios, confirma y actualiza la sesión', async () => {
    const user = userEvent.setup();
    userService.updateMyProfile.mockResolvedValue({
      message: 'Perfil actualizado correctamente.',
      user: { ...PROFILE, name: 'Ana López', contactEmail: 'ventas@correo.com' },
    });
    await openEditor(user);

    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    await replace(user, 'Nombre completo', 'Ana López');
    await replace(user, 'Correo de contacto', '  Ventas@Correo.com ');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(userService.updateMyProfile).toHaveBeenCalledWith({
      name: 'Ana López',
      contactEmail: 'ventas@correo.com',
    });
    expect(await screen.findByText('Perfil actualizado correctamente.')).toBeInTheDocument();
    expect(screen.getByText('ventas@correo.com')).toBeInTheDocument();
    expect(screen.getByTestId('session-name')).toHaveTextContent('Ana López');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION)).user.name).toBe('Ana López');

    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByText('Perfil actualizado correctamente.')).not.toBeInTheDocument();
  });

  it('usa un mensaje por defecto si el backend no envía uno', async () => {
    const user = userEvent.setup();
    userService.updateMyProfile.mockResolvedValue({ user: { ...PROFILE, phone: null } });
    await openEditor(user);

    await replace(user, 'Teléfono de contacto', '');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(userService.updateMyProfile).toHaveBeenCalledWith({ phone: '' });
    expect(await screen.findByText('Perfil actualizado correctamente.')).toBeInTheDocument();
  });

  it.each([
    ['Nombre completo', '', 'El nombre es obligatorio.'],
    ['Nombre completo', 'A', 'El nombre debe tener al menos 2 caracteres.'],
    ['Nombre completo', 'A'.repeat(101), 'El nombre no puede superar los 100 caracteres.'],
    ['Correo electrónico de la cuenta', '', 'El correo electrónico es obligatorio.'],
    ['Correo electrónico de la cuenta', 'ana@correo', 'Ingresa un correo electrónico válido.'],
    ['Teléfono de contacto', '77-ABC-1234', 'El teléfono solo puede contener números, espacios, guiones y +.'],
    ['Teléfono de contacto', '12345', 'El teléfono debe tener entre 10 y 15 dígitos.'],
    ['Correo de contacto', 'ventas@', 'Ingresa un correo de contacto válido.'],
  ])('CA3 valida "%s" = "%s" sin enviar datos', async (label, value, message) => {
    const user = userEvent.setup();
    await openEditor(user);

    await replace(user, label, value);
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(userService.updateMyProfile).not.toHaveBeenCalled();
    // Lo capturado se conserva y el error desaparece al corregir.
    await user.type(field(label), 'x');
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  it('CA3 un correo ya registrado (409) se marca en el campo', async () => {
    const user = userEvent.setup();
    userService.updateMyProfile.mockRejectedValue(
      Object.assign(new Error('Conflicto'), {
        status: 409,
        details: { message: 'El correo electrónico ya está registrado.' },
      }),
    );
    await openEditor(user);

    await replace(user, 'Correo electrónico de la cuenta', 'otro@correo.com');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('El correo electrónico ya está registrado.')).toBeInTheDocument();
    expect(field('Correo electrónico de la cuenta')).toHaveValue('otro@correo.com');
  });

  it('CA3 los errores 400 del backend se muestran en su campo', async () => {
    const user = userEvent.setup();
    userService.updateMyProfile.mockRejectedValue(
      Object.assign(new Error('Datos inválidos'), {
        status: 400,
        details: {
          errors: [
            { field: 'phone', message: 'Teléfono no válido para el backend.' },
            { field: 'phone', message: 'Segundo mensaje ignorado.' },
          ],
        },
      }),
    );
    await openEditor(user);

    await replace(user, 'Teléfono de contacto', '7739876543');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Teléfono no válido para el backend.')).toBeInTheDocument();
    expect(screen.queryByText('Segundo mensaje ignorado.')).not.toBeInTheDocument();
  });

  it('un 400 sin campos conocidos o un error del servidor muestran un aviso general', async () => {
    const user = userEvent.setup();
    userService.updateMyProfile
      .mockRejectedValueOnce(
        Object.assign(new Error('Datos inválidos'), {
          status: 400,
          details: { message: 'Solicitud no válida.', errors: [{ field: 'role', message: 'x' }] },
        }),
      )
      .mockRejectedValueOnce(Object.assign(new Error('Error del servidor.'), { status: 500 }));
    await openEditor(user);

    await replace(user, 'Nombre completo', 'Ana López');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Solicitud no válida.')).toBeInTheDocument();
    expect(screen.getByText('No se pudieron guardar los cambios')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Error del servidor.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByText('Error del servidor.')).not.toBeInTheDocument();
  });

  it('enviar sin cambios solo cierra el formulario', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    await act(async () => field('Nombre completo').form.requestSubmit());

    expect(userService.updateMyProfile).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Editar perfil' })).toBeInTheDocument();
  });
});

describe('HU-019 CA4 · Cambios sin guardar', () => {
  it('Cancelar sin cambios regresa a la vista del perfil', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm');
    await openEditor(user);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Editar perfil' })).toBeInTheDocument();
  });

  it('Cancelar con cambios pide confirmación', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await openEditor(user);
    await replace(user, 'Nombre completo', 'Ana López');

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(field('Nombre completo')).toHaveValue('Ana López');

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Ana Pérez', { selector: 'dd' })).toBeInTheDocument();
  });

  it('salir a otra pantalla con cambios pide confirmación', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { router } = renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Editar perfil' }));
    await replace(user, 'Nombre completo', 'Ana López');

    await act(() => router.navigate('/'));
    expect(router.state.location.pathname).toBe('/perfil');

    await act(() => router.navigate('/'));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Página de inicio')).toBeInTheDocument();
  });

  it('recargar o cerrar la pestaña con cambios muestra el aviso del navegador', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    const before = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(false);

    await replace(user, 'Nombre completo', 'Ana López');
    const after = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(true);
  });
});

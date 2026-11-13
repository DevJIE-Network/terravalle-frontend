import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authService from '@/api/auth.service';
import LoginPage from '@/pages/Login/LoginPage';
import { buildToken, renderWithAuth } from './renderWithAuth';

vi.mock('@/api/auth.service', async (importOriginal) => ({
  ...(await importOriginal()),
  login: vi.fn(),
}));

const ROUTES = [
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <p>Inicio</p> },
  { path: '/mis-propiedades', element: <p>Panel privado</p> },
  { path: '/registro', element: <p>Registro</p> },
];

function renderLogin(entry = '/login', session) {
  return renderWithAuth(ROUTES, { initialEntries: [entry], session });
}

const email = () => screen.getByLabelText('Correo electrónico');
const password = () => screen.getByLabelText('Contraseña');
const submit = () => screen.getByRole('button', { name: 'Iniciar sesión' });

beforeEach(() => {
  authService.login.mockReset();
});

describe('HU-018 · Iniciar sesión', () => {
  it('pide correo y contraseña sin llamar al backend', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(submit());

    expect(screen.getByText('El correo electrónico es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('valida el formato del correo y limpia el error al corregirlo', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(email(), 'ana@correo');
    await user.type(password(), 'secreta');
    await user.click(submit());
    expect(screen.getByText('Ingresa un correo electrónico válido.')).toBeInTheDocument();

    await user.type(email(), '.com');
    expect(screen.queryByText('Ingresa un correo electrónico válido.')).not.toBeInTheDocument();
  });

  it('inicia sesión con el correo normalizado y vuelve al inicio', async () => {
    const user = userEvent.setup();
    authService.login.mockResolvedValue({ user: { name: 'Ana' }, token: 'jwt' });
    renderLogin();

    await user.type(email(), '  Ana@Correo.com ');
    await user.type(password(), 'secreta');
    await user.click(submit());

    expect(authService.login).toHaveBeenCalledWith({
      email: 'ana@correo.com',
      password: 'secreta',
    });
    expect(await screen.findByText('Inicio')).toBeInTheDocument();
    expect(screen.getByTestId('session')).toHaveTextContent('Ana');
  });

  it('regresa a la página privada que se intentó abrir', async () => {
    const user = userEvent.setup();
    authService.login.mockResolvedValue({ user: { name: 'Ana' }, token: 'jwt' });
    renderLogin({ pathname: '/login', state: { from: { pathname: '/mis-propiedades' } } });

    await user.type(email(), 'ana@correo.com');
    await user.type(password(), 'secreta');
    await user.click(submit());

    expect(await screen.findByText('Panel privado')).toBeInTheDocument();
  });

  it('muestra el error general y permite volver a intentar', async () => {
    const user = userEvent.setup();
    authService.login.mockRejectedValueOnce(new Error('Correo o contraseña no válidos.'));
    renderLogin();

    await user.type(email(), 'ana@correo.com');
    await user.type(password(), 'mala');
    await user.click(submit());

    expect(await screen.findByText('No se pudo iniciar sesión')).toBeInTheDocument();
    expect(screen.getByText('Correo o contraseña no válidos.')).toBeInTheDocument();
    expect(submit()).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(screen.queryByText('No se pudo iniciar sesión')).not.toBeInTheDocument();
  });

  it('usa un mensaje por defecto si el error no trae texto', async () => {
    const user = userEvent.setup();
    authService.login.mockRejectedValue(new Error(''));
    renderLogin();

    await user.type(email(), 'ana@correo.com');
    await user.type(password(), 'secreta');
    await user.click(submit());

    expect(
      await screen.findByText('No fue posible iniciar sesión. Intenta nuevamente.'),
    ).toBeInTheDocument();
  });

  it('muestra y oculta la contraseña', async () => {
    const user = userEvent.setup();
    renderLogin();

    expect(password()).toHaveAttribute('type', 'password');
    await user.click(screen.getByLabelText('Mostrar contraseña'));
    expect(password()).toHaveAttribute('type', 'text');
  });

  it('muestra el mensaje que llega desde el registro y se puede cerrar', async () => {
    const user = userEvent.setup();
    renderLogin({ pathname: '/login', state: { message: 'Cuenta creada correctamente.' } });

    expect(screen.getAllByText('Cuenta creada correctamente.').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /cerrar/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('avisa que la sesión expiró cuando el token guardado venció', async () => {
    const user = userEvent.setup();
    renderLogin('/login', { token: buildToken(1), user: { name: 'Ana' } });

    expect(screen.getByText('Tu sesión expiró')).toBeInTheDocument();
    expect(screen.getByTestId('session')).toHaveTextContent('sin sesión');

    await user.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(screen.queryByText('Tu sesión expiró')).not.toBeInTheDocument();
  });

  it('enlaza a la creación de cuenta', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('link', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Registro')).toBeInTheDocument();
  });
});

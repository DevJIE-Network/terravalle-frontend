import { afterEach, describe, expect, it, vi } from 'vitest';
import client from '@/api/client';
import { INVALID_CREDENTIALS_MESSAGE, login, register } from '@/api/auth.service';

afterEach(() => {
  vi.restoreAllMocks();
});

const httpError = (status, message = 'Error HTTP') => Object.assign(new Error(message), { status });

describe('auth.service · register (HU-017)', () => {
  it('envía los datos a POST /auth/register y devuelve la respuesta', async () => {
    const body = { user: { id: 1, name: 'Ana' } };
    const post = vi.spyOn(client, 'post').mockResolvedValue({ data: body });
    const payload = { name: 'Ana', email: 'ana@correo.com', password: 'secreta123' };

    await expect(register(payload)).resolves.toEqual(body);
    expect(post).toHaveBeenCalledWith('/auth/register', payload);
  });
});

describe('auth.service · login (HU-018)', () => {
  it('inicia sesión sin token previo y devuelve usuario y token', async () => {
    const user = { id: 1, name: 'Ana', email: 'ana@correo.com' };
    const post = vi.spyOn(client, 'post').mockResolvedValue({ data: { user, token: 'jwt' } });

    await expect(login({ email: 'ana@correo.com', password: 'x' })).resolves.toEqual({
      user,
      token: 'jwt',
    });
    expect(post).toHaveBeenCalledWith(
      '/auth/login',
      { email: 'ana@correo.com', password: 'x' },
      { skipAuth: true },
    );
  });

  it('acepta accessToken y arma el usuario con el correo si no viene', async () => {
    vi.spyOn(client, 'post').mockResolvedValue({ data: { accessToken: 'jwt-2' } });

    await expect(login({ email: 'ana@correo.com', password: 'x' })).resolves.toEqual({
      user: { email: 'ana@correo.com' },
      token: 'jwt-2',
    });
  });

  it('rechaza una respuesta sin token', async () => {
    vi.spyOn(client, 'post').mockResolvedValue({ data: { user: { id: 1 } } });

    await expect(login({ email: 'a@b.co', password: 'x' })).rejects.toThrow(
      'Respuesta de inicio de sesión inválida.',
    );
  });

  it('rechaza una respuesta vacía', async () => {
    vi.spyOn(client, 'post').mockResolvedValue({ data: null });

    await expect(login({ email: 'a@b.co', password: 'x' })).rejects.toThrow(
      'Respuesta de inicio de sesión inválida.',
    );
  });

  it.each([400, 401, 403, 404, 422])(
    'convierte un %i en el mensaje genérico de credenciales',
    async (status) => {
      vi.spyOn(client, 'post').mockRejectedValue(httpError(status, 'Usuario no encontrado'));

      const error = await login({ email: 'a@b.co', password: 'x' }).catch((caught) => caught);

      expect(error.message).toBe(INVALID_CREDENTIALS_MESSAGE);
      expect(error.status).toBe(status);
    },
  );

  it('conserva el mensaje en errores de servidor o de red', async () => {
    vi.spyOn(client, 'post').mockRejectedValue(httpError(500, 'El servidor no responde'));

    await expect(login({ email: 'a@b.co', password: 'x' })).rejects.toThrow(
      'El servidor no responde',
    );
  });
});

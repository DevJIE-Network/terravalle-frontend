import { describe, expect, it, vi } from 'vitest';
import client, { setUnauthorizedHandler } from '@/api/client';
import { getPublicProperties } from '@/api/property.service';
import { STORAGE_KEYS } from '@/utils/constants';

describe('HU-026 · servicio del catálogo público (HU-010)', () => {
  it('consulta la primera página con límite 12 y conserva el contrato de paginación', async () => {
    const properties = [{ id: 7, title: 'Terreno en Tula' }];
    const pagination = {
      page: 1,
      limit: 12,
      total: 20,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    };
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: { properties, pagination } });

    await expect(getPublicProperties()).resolves.toEqual({ properties, pagination });
    expect(get).toHaveBeenCalledWith('/properties', {
      params: { page: 1, limit: 12 },
      skipAuth: true,
    });
  });

  it('envía la página solicitada sin filtros ni campos de propietario', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: {} });
    await expect(getPublicProperties({ page: 3, limit: 12 })).resolves.toEqual({
      properties: [],
      pagination: null,
    });
    expect(get).toHaveBeenCalledWith('/properties', {
      params: { page: 3, limit: 12 },
      skipAuth: true,
    });
  });

  it('no adjunta credenciales aunque haya una sesión guardada', async () => {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ token: 'token-privado' }));
    const adapter = vi.fn(async (config) => ({
      data: { properties: [], pagination: null },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    vi.spyOn(client, 'get').mockImplementation((url, config) =>
      client.request({ ...config, url, method: 'get', adapter }),
    );

    await getPublicProperties();
    expect(adapter).toHaveBeenCalledOnce();
    expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBeUndefined();
  });

  it('un fallo público propaga un mensaje amigable sin cerrar la sesión', async () => {
    const unauthorized = vi.fn();
    setUnauthorizedHandler(unauthorized);
    const adapter = vi.fn(async (config) => {
      throw Object.assign(new Error('Unauthorized'), { response: { status: 401 }, config });
    });
    vi.spyOn(client, 'get').mockImplementation((url, config) =>
      client.request({ ...config, url, method: 'get', adapter }),
    );

    try {
      await expect(getPublicProperties()).rejects.toMatchObject({ status: 401 });
      expect(unauthorized).not.toHaveBeenCalled();
    } finally {
      setUnauthorizedHandler(null);
    }
  });
});

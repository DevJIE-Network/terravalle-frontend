import { describe, expect, it, vi } from 'vitest';
import client from '@/api/client';
import {
  changePropertyStatus,
  listMyProperties,
  updateProperty,
  withdrawProperty,
} from '@/api/propertyManagement.service';

describe('propertyManagement.service (HU-024 · operaciones de HU-008)', () => {
  it('listMyProperties consulta /properties/mine con filtros y normaliza la respuesta', async () => {
    const properties = [{ id: '1' }];
    const pagination = { page: 1, totalPages: 1 };
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: { properties, pagination } });

    await expect(listMyProperties({ status: 'draft', page: 2, limit: 12 })).resolves.toEqual({
      properties,
      pagination,
    });
    expect(get).toHaveBeenCalledWith('/properties/mine', {
      params: { status: 'draft', page: 2, limit: 12 },
    });
  });

  it('listMyProperties tolera una respuesta sin lista ni paginación', async () => {
    vi.spyOn(client, 'get').mockResolvedValue({ data: {} });
    await expect(listMyProperties()).resolves.toEqual({ properties: [], pagination: null });
  });

  it('listMyProperties nunca envía un id de usuario (el dueño sale del token)', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: {} });
    await listMyProperties({ status: 'active' });
    expect(JSON.stringify(get.mock.calls[0])).not.toMatch(/owner|user/i);
  });

  it('updateProperty envía PATCH solo con los cambios', async () => {
    const body = { message: 'ok', property: { id: '7' } };
    const patch = vi.spyOn(client, 'patch').mockResolvedValue({ data: body });

    await expect(updateProperty('7', { title: 'Nuevo' })).resolves.toEqual(body);
    expect(patch).toHaveBeenCalledWith('/properties/7', { title: 'Nuevo' });
  });

  it('changePropertyStatus envía PATCH /status y devuelve la propiedad', async () => {
    const patch = vi
      .spyOn(client, 'patch')
      .mockResolvedValue({ data: { property: { id: '7', status: 'inactive' } } });

    await expect(changePropertyStatus('7', 'inactive')).resolves.toEqual({
      id: '7',
      status: 'inactive',
    });
    expect(patch).toHaveBeenCalledWith('/properties/7/status', { status: 'inactive' });
  });

  it('changePropertyStatus incluye el motivo solo si se da, y tolera una respuesta sin propiedad', async () => {
    const patch = vi.spyOn(client, 'patch').mockResolvedValue({ data: {} });

    await expect(changePropertyStatus('7', 'active', 'Reactivada')).resolves.toBeNull();
    expect(patch).toHaveBeenCalledWith('/properties/7/status', {
      status: 'active',
      reason: 'Reactivada',
    });
  });

  it('withdrawProperty envía DELETE', async () => {
    const del = vi
      .spyOn(client, 'delete')
      .mockResolvedValue({ data: { property: { id: '7', status: 'withdrawn' } } });

    await expect(withdrawProperty('7')).resolves.toEqual({ id: '7', status: 'withdrawn' });
    expect(del).toHaveBeenCalledWith('/properties/7');
  });

  it('propaga los errores del cliente (403, 409...)', async () => {
    vi.spyOn(client, 'delete').mockRejectedValue(Object.assign(new Error('x'), { status: 409 }));
    await expect(withdrawProperty('7')).rejects.toMatchObject({ status: 409 });
  });
});

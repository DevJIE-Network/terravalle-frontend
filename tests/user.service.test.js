import { describe, expect, it, vi } from 'vitest';
import client from '@/api/client';
import { getMyProfile, updateMyProfile } from '@/api/user.service';

describe('userService (HU-019)', () => {
  it('getMyProfile consulta /users/me y devuelve el usuario', async () => {
    const user = { id: '1', name: 'Ana' };
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: { user } });

    await expect(getMyProfile()).resolves.toEqual(user);
    expect(get).toHaveBeenCalledWith('/users/me');
  });

  it('updateMyProfile envía solo los cambios con PATCH /users/me', async () => {
    const body = { message: 'Perfil actualizado.', user: { id: '1', name: 'Ana López' } };
    const patch = vi.spyOn(client, 'patch').mockResolvedValue({ data: body });

    await expect(updateMyProfile({ name: 'Ana López' })).resolves.toEqual(body);
    expect(patch).toHaveBeenCalledWith('/users/me', { name: 'Ana López' });
  });
});

import { describe, expect, it, vi } from 'vitest';
import client from '@/api/client';
import { getPropertyDimensions, savePropertyDimensions } from '@/api/property.service';

describe('property.service · dimensiones (HU-021)', () => {
  it('getPropertyDimensions consulta /properties/:id/dimensions', async () => {
    const dimensions = { landArea: 250 };
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: { dimensions } });

    await expect(getPropertyDimensions('7')).resolves.toEqual(dimensions);
    expect(get).toHaveBeenCalledWith('/properties/7/dimensions');
  });

  it('getPropertyDimensions devuelve null si aún no hay datos (404)', async () => {
    vi.spyOn(client, 'get').mockRejectedValue(Object.assign(new Error('x'), { status: 404 }));
    await expect(getPropertyDimensions('7')).resolves.toBeNull();
  });

  it('getPropertyDimensions propaga otros errores', async () => {
    vi.spyOn(client, 'get').mockRejectedValue(
      Object.assign(new Error('Sin permiso'), { status: 403 }),
    );
    await expect(getPropertyDimensions('7')).rejects.toThrow('Sin permiso');
  });

  it('savePropertyDimensions envía PUT con el cuerpo', async () => {
    const body = { message: 'ok', dimensions: { landArea: 250 } };
    const put = vi.spyOn(client, 'put').mockResolvedValue({ data: body });

    await expect(savePropertyDimensions('7', { landArea: 250 })).resolves.toEqual(body);
    expect(put).toHaveBeenCalledWith('/properties/7/dimensions', { landArea: 250 });
  });
});

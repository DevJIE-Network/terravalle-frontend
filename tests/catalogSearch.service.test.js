import { describe, expect, it, vi } from 'vitest';
import client from '@/api/client';
import { getPublicProperties, getPublicServiceCatalog } from '@/api/property.service';

describe('servicio de búsqueda del catálogo', () => {
  it('envía solo los criterios con valor, con los nombres del backend', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: {} });
    await getPublicProperties({
      page: 2,
      limit: 12,
      q: 'casa',
      propertyTypeId: 2,
      minPrice: 0,
      maxPrice: 900000,
      state: 'Hidalgo',
      municipality: '',
      minLandArea: undefined,
      maxLandArea: null,
      hasConstruction: false,
      serviceIds: [1, 3],
    });
    expect(get).toHaveBeenCalledWith('/properties', {
      params: {
        page: 2,
        limit: 12,
        q: 'casa',
        propertyTypeId: 2,
        minPrice: 0,
        maxPrice: 900000,
        state: 'Hidalgo',
        hasConstruction: false,
        serviceIds: '1,3',
      },
      skipAuth: true,
    });
  });

  it('no reenvía parámetros desconocidos (status, ownerId...) ni serviceIds vacío', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: {} });
    await getPublicProperties({ status: 'draft', ownerId: 1, serviceIds: [] });
    expect(get).toHaveBeenCalledWith('/properties', {
      params: { page: 1, limit: 12 },
      skipAuth: true,
    });
  });

  it('el catálogo de servicios es público: no adjunta token', async () => {
    const services = [{ id: 1, name: 'Agua potable', description: null }];
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: { services } });
    await expect(getPublicServiceCatalog()).resolves.toEqual(services);
    expect(get).toHaveBeenCalledWith('/services', { skipAuth: true });

    get.mockResolvedValue({ data: {} });
    await expect(getPublicServiceCatalog()).resolves.toEqual([]);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import client from '@/api/client';
import {
  createNearbyPlace,
  deleteNearbyPlace,
  getNearbyPlaceCategories,
  getNearbyPlaces,
  getPropertyLocation,
  savePropertyLocation,
} from '@/api/property.service';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('property.service · ubicación y puntos cercanos (HU-023)', () => {
  it('getPropertyLocation consulta /properties/:id/location', async () => {
    const location = { id: '3', street: 'Av. Juárez 10' };
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: { location } });

    await expect(getPropertyLocation('7')).resolves.toEqual(location);
    expect(get).toHaveBeenCalledWith('/properties/7/location');
  });

  it('getPropertyLocation devuelve null si la respuesta viene vacía', async () => {
    vi.spyOn(client, 'get').mockResolvedValue({ data: { location: null } });
    await expect(getPropertyLocation('7')).resolves.toBeNull();
  });

  it('getPropertyLocation interpreta 404 como ubicación sin registrar', async () => {
    vi.spyOn(client, 'get').mockRejectedValue(
      Object.assign(new Error('Not found'), { status: 404 }),
    );
    await expect(getPropertyLocation('7')).resolves.toBeNull();
  });

  it('getPropertyLocation propaga errores distintos de 404 (p. ej. 403)', async () => {
    vi.spyOn(client, 'get').mockRejectedValue(
      Object.assign(new Error('Acceso denegado'), { status: 403 }),
    );
    await expect(getPropertyLocation('7')).rejects.toThrow('Acceso denegado');
  });

  it('savePropertyLocation envía PUT con el cuerpo de la ubicación', async () => {
    const body = {
      message: 'Ubicación guardada correctamente.',
      location: { id: '3', municipality: 'Tula de Allende' },
    };
    const put = vi.spyOn(client, 'put').mockResolvedValue({ data: body });
    const payload = { municipality: 'Tula de Allende', state: 'Hidalgo' };

    await expect(savePropertyLocation('7', payload)).resolves.toEqual(body);
    expect(put).toHaveBeenCalledWith('/properties/7/location', payload);
  });

  it('getNearbyPlaceCategories consulta /properties/nearby-place-categories', async () => {
    const categories = [
      { id: 1, name: 'Hospital', isActive: true },
      { id: 2, name: 'Escuela', isActive: true },
    ];
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: { categories } });

    await expect(getNearbyPlaceCategories()).resolves.toEqual(categories);
    expect(get).toHaveBeenCalledWith('/properties/nearby-place-categories');
  });

  it('getNearbyPlaceCategories devuelve lista vacía si no trae categorías', async () => {
    vi.spyOn(client, 'get').mockResolvedValue({ data: {} });
    await expect(getNearbyPlaceCategories()).resolves.toEqual([]);
  });

  it('getNearbyPlaces consulta /properties/:id/nearby-places', async () => {
    const nearbyPlaces = [
      { id: '1', name: 'Hospital General', approximateDistanceM: 650 },
    ];
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: { nearbyPlaces } });

    await expect(getNearbyPlaces('7')).resolves.toEqual(nearbyPlaces);
    expect(get).toHaveBeenCalledWith('/properties/7/nearby-places');
  });

  it('createNearbyPlace envía POST con el punto cercano', async () => {
    const body = {
      message: 'Punto cercano agregado correctamente.',
      nearbyPlace: { id: '1', name: 'Hospital General' },
    };
    const post = vi.spyOn(client, 'post').mockResolvedValue({ data: body });
    const payload = { categoryId: 1, name: 'Hospital General', approximateDistanceM: 650 };

    await expect(createNearbyPlace('7', payload)).resolves.toEqual(body);
    expect(post).toHaveBeenCalledWith('/properties/7/nearby-places', payload);
  });

  it('deleteNearbyPlace consulta DELETE /properties/:id/nearby-places/:placeId', async () => {
    const body = { message: 'Punto cercano eliminado correctamente.' };
    const remove = vi.spyOn(client, 'delete').mockResolvedValue({ data: body });

    await expect(deleteNearbyPlace('7', '1')).resolves.toEqual(body);
    expect(remove).toHaveBeenCalledWith('/properties/7/nearby-places/1');
  });
});

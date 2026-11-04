import { afterEach, describe, expect, it, vi } from 'vitest';
import client from '@/api/client';
import {
  getMyProperty,
  getPropertyServices,
  getServiceCatalog,
  savePropertyServices,
} from '@/api/property.service';
import {
  isSameSelection,
  selectionFromServices,
  serviceIconName,
  toServiceIds,
  toggleService,
} from '@/utils/propertyServices';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('property.service · servicios (HU-022)', () => {
  it('getServiceCatalog consulta /services', async () => {
    const services = [{ id: 1, name: 'Gas' }];
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: { services } });

    await expect(getServiceCatalog()).resolves.toEqual(services);
    expect(get).toHaveBeenCalledWith('/services');
  });

  it('getPropertyServices consulta /properties/:id/services', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: { services: [] } });

    await expect(getPropertyServices('7')).resolves.toEqual([]);
    expect(get).toHaveBeenCalledWith('/properties/7/services');
  });

  it('devuelve listas vacías si la respuesta no trae servicios', async () => {
    vi.spyOn(client, 'get').mockResolvedValue({ data: {} });

    await expect(getServiceCatalog()).resolves.toEqual([]);
    await expect(getPropertyServices('7')).resolves.toEqual([]);
  });

  it('savePropertyServices envía PUT con serviceIds', async () => {
    const body = { message: 'ok', services: [{ id: 2, name: 'Electricidad' }] };
    const put = vi.spyOn(client, 'put').mockResolvedValue({ data: body });

    await expect(savePropertyServices('7', [2])).resolves.toEqual(body);
    expect(put).toHaveBeenCalledWith('/properties/7/services', { serviceIds: [2] });
  });

  it('getMyProperty consulta /properties/mine/:id', async () => {
    const property = { id: '7', title: 'Casa' };
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: { property } });

    await expect(getMyProperty('7')).resolves.toEqual(property);
    expect(get).toHaveBeenCalledWith('/properties/mine/7');
  });
});

describe('utils · propertyServices (HU-022)', () => {
  it('asigna el ícono por nombre, sin importar acentos ni mayúsculas', () => {
    expect(serviceIconName({ name: 'Alumbrado público' })).toBe('lamp');
    expect(serviceIconName({ name: 'PAVIMENTACION' })).toBe('road');
    expect(serviceIconName({ name: 'Agua potable' })).toBe('droplet');
    expect(serviceIconName({ name: 'Servicio nuevo' })).toBe('check');
    expect(serviceIconName(undefined)).toBe('check');
  });

  it('arma la selección sin duplicados', () => {
    const selection = selectionFromServices([{ id: 1 }, { id: '1' }, { id: 3 }]);
    expect([...selection]).toEqual([1, 3]);
    expect(selectionFromServices(null).size).toBe(0);
  });

  it('marca y desmarca sin mutar la selección original', () => {
    const original = new Set([1]);
    const added = toggleService(original, 2);
    const removed = toggleService(added, 1);

    expect([...original]).toEqual([1]);
    expect([...added]).toEqual([1, 2]);
    expect([...removed]).toEqual([2]);
  });

  it('compara selecciones', () => {
    expect(isSameSelection(new Set([1, 2]), new Set([2, 1]))).toBe(true);
    expect(isSameSelection(new Set([1]), new Set([1, 2]))).toBe(false);
    expect(isSameSelection(new Set([1, 3]), new Set([1, 2]))).toBe(false);
  });

  it('envía solo ids del catálogo y en su orden', () => {
    const catalog = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(toServiceIds(new Set([3, 1, 99]), catalog)).toEqual([1, 3]);
  });
});

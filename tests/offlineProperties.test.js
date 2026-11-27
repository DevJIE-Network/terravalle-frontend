import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '@/utils/constants';
import {
  getOfflineProperty,
  isNetworkError,
  listOfflineProperties,
  MAX_OFFLINE_PROPERTIES,
  OFFLINE_MAX_AGE_MS,
  removeOfflineProperty,
  saveOfflineProperty,
} from '@/utils/offlineProperties';

const property = (id, extra = {}) => ({
  id,
  title: `Propiedad ${id}`,
  propertyType: { id: 1, name: 'Terreno' },
  ...extra,
});

beforeEach(() => localStorage.clear());

describe('copias locales de fichas', () => {
  it('guarda y recupera una ficha con sus notas y la fecha en que se guardó', () => {
    saveOfflineProperty(property('7'), { estimate: 'Orientativa' }, 1000);
    expect(getOfflineProperty(7, 2000)).toEqual({
      id: '7',
      savedAt: 1000,
      property: property('7'),
      notes: { estimate: 'Orientativa' },
    });
    expect(getOfflineProperty('8', 2000)).toBeNull();
  });

  it('renueva la copia existente y la pone primero', () => {
    saveOfflineProperty(property('1'), {}, 1000);
    saveOfflineProperty(property('2'), {}, 2000);
    saveOfflineProperty(property('1', { title: 'Actualizada' }), {}, 3000);
    expect(listOfflineProperties(3000).map((item) => [item.id, item.title])).toEqual([
      ['1', 'Actualizada'],
      ['2', 'Propiedad 2'],
    ]);
  });

  it('conserva solo las fichas más recientes', () => {
    for (let i = 1; i <= MAX_OFFLINE_PROPERTIES + 3; i += 1)
      saveOfflineProperty(property(String(i)), {}, i);
    const saved = listOfflineProperties(100);
    expect(saved).toHaveLength(MAX_OFFLINE_PROPERTIES);
    expect(saved[0].id).toBe(String(MAX_OFFLINE_PROPERTIES + 3));
    expect(getOfflineProperty('1', 100)).toBeNull();
  });

  it('descarta las copias caducadas', () => {
    saveOfflineProperty(property('1'), {}, 0);
    expect(getOfflineProperty('1', OFFLINE_MAX_AGE_MS)).not.toBeNull();
    expect(getOfflineProperty('1', OFFLINE_MAX_AGE_MS + 1)).toBeNull();
    expect(listOfflineProperties(OFFLINE_MAX_AGE_MS + 1)).toEqual([]);
  });

  it('quita la copia de una ficha que ya no está disponible', () => {
    saveOfflineProperty(property('1'), {}, 1);
    removeOfflineProperty(1);
    expect(getOfflineProperty('1', 2)).toBeNull();
  });

  it('tolera datos dañados en el almacenamiento', () => {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_PROPERTIES, '{no es json');
    expect(listOfflineProperties()).toEqual([]);
    saveOfflineProperty(property('3'), {}, 1);
    expect(getOfflineProperty('3', 2)?.property.title).toBe('Propiedad 3');
  });

  it('ignora fichas sin id', () => {
    saveOfflineProperty(null);
    saveOfflineProperty({ title: 'Sin id' });
    expect(listOfflineProperties()).toEqual([]);
  });
});

describe('isNetworkError', () => {
  it('distingue la falta de respuesta de los errores del servidor', () => {
    expect(isNetworkError({ status: null, code: 'ERR_NETWORK' })).toBe(true);
    expect(isNetworkError({ status: null, code: 'ECONNABORTED' })).toBe(true);
    expect(isNetworkError({ status: 500, code: 'ERR_BAD_RESPONSE' })).toBe(false);
    expect(isNetworkError({ status: 404 })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});

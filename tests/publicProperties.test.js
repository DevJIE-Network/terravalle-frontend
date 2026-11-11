import { describe, expect, it } from 'vitest';
import { buildPublicPropertyPath } from '@/utils/constants';
import {
  appendUniqueProperties,
  formatMxnPrice,
  formatPropertyArea,
  getPublicPhotoUrl,
  getPublicPropertyType,
  summarizePropertyLocation,
} from '@/utils/publicProperties';

describe('HU-026 · presentación de propiedades públicas', () => {
  it('formatea números y decimales serializados como MXN, sin cambiar el helper existente', () => {
    expect(formatMxnPrice(1500000)).toBe('$1,500,000 MXN');
    expect(formatMxnPrice('1500000.00')).toBe('$1,500,000 MXN');
    expect(formatMxnPrice(0)).toBe('$0 MXN');
  });

  it.each([null, undefined, '', ' ', 'no disponible', -1, Infinity])(
    'no presenta %s como un precio o superficie real',
    (value) => {
      expect(formatMxnPrice(value)).toBe('Precio por consultar');
      expect(formatPropertyArea(value)).toBe('Superficie no disponible');
    },
  );

  it('presenta superficies en m² y respeta sus decimales', () => {
    expect(formatPropertyArea(200)).toBe('200 m²');
    expect(formatPropertyArea('1250.50')).toBe('1,250.5 m²');
  });

  it('resume únicamente municipio y estado, sin usar la dirección completa', () => {
    expect(
      summarizePropertyLocation({
        municipality: ' Tula de Allende ',
        state: 'Hidalgo',
        street: 'Dirección no pública',
      }),
    ).toBe('Tula de Allende, Hidalgo');
    expect(summarizePropertyLocation({ state: 'Hidalgo' })).toBe('Hidalgo');
    expect(summarizePropertyLocation(null)).toBe('Ubicación no disponible');
    expect(summarizePropertyLocation({ municipality: ' ' })).toBe('Ubicación no disponible');
  });

  it('usa propertyType y primaryPhoto sin inventar otros campos del listado', () => {
    expect(getPublicPropertyType({ id: 1, name: 'Terreno' })).toBe('Terreno');
    expect(getPublicPropertyType('Casa')).toBe('Casa');
    expect(getPublicPropertyType(null)).toBe('Propiedad');
    expect(getPublicPhotoUrl({ url: 'https://img.test/casa.jpg' })).toBe(
      'https://img.test/casa.jpg',
    );
    expect(getPublicPhotoUrl(' /fotos/terreno.jpg ')).toBe('/fotos/terreno.jpg');
    expect(getPublicPhotoUrl(null)).toBeNull();
    expect(getPublicPhotoUrl({ url: ' ' })).toBeNull();
  });

  it('deduplica dentro y entre páginas por id, manteniendo la primera aparición y el orden', () => {
    const first = [
      { id: 9, title: 'Primera' },
      { id: 2, title: 'Segunda' },
    ];
    const next = [{ id: '2', title: 'Duplicada' }, { id: 7 }, { id: 7 }, { id: 1 }];
    const merged = appendUniqueProperties(first, next);
    expect(merged.map(({ id }) => id)).toEqual([9, 2, 7, 1]);
    expect(merged[1]).toBe(first[1]);
    expect(first).toHaveLength(2);
    expect(next).toHaveLength(4);
    expect(appendUniqueProperties([], [null, {}, { id: null }, { id: 0 }])).toEqual([{ id: 0 }]);
  });

  it('construye rutas públicas independientes de los formularios privados', () => {
    expect(buildPublicPropertyPath(7)).toBe('/propiedades/7');
    expect(buildPublicPropertyPath('id/con espacio')).toBe('/propiedades/id%2Fcon%20espacio');
  });
});

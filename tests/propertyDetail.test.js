import { describe, expect, it, vi } from 'vitest';
import client from '@/api/client';
import { addFavorite, listFavorites, removeFavorite } from '@/api/favorite.service';
import { getPropertyContact, getPublicProperty } from '@/api/property.service';
import { API_URL } from '@/utils/constants';
import { resolveMediaUrl } from '@/utils/media';
import {
  addressLines,
  constructionRows,
  contactLink,
  dimensionRows,
  formatApproxDistance,
  galleryPhotos,
  groupNearbyPlaces,
  hasCoordinates,
  isUnavailableError,
  mapEmbedUrl,
} from '@/utils/propertyDetail';

describe('utilidades de la ficha pública', () => {
  it('formatea distancias aproximadas en metros y kilómetros', () => {
    expect(formatApproxDistance(349.6)).toBe('≈ 350 m');
    expect(formatApproxDistance(2400)).toBe('≈ 2.4 km');
    expect(formatApproxDistance(null)).toBe('Distancia no registrada');
    expect(formatApproxDistance('abc')).toBe('Distancia no registrada');
  });

  it('solo genera filas para los datos presentes', () => {
    expect(dimensionRows(null)).toEqual([]);
    expect(dimensionRows({ landArea: 300, frontage: null, depth: null })).toHaveLength(1);
    const rows = constructionRows({ builtArea: 120, bedrooms: 3, constructionAge: 0 });
    expect(rows.map((row) => row.label)).toEqual([
      'Superficie construida',
      'Recámaras',
      'Antigüedad',
    ]);
    expect(rows.at(-1).value).toBe('A estrenar');
    expect(constructionRows({ constructionAge: 1 })[0].value).toBe('1 año');
  });

  it('ordena la galería con la foto principal primero y descarta fotos sin URL', () => {
    const photos = galleryPhotos([
      { id: 1, imageUrl: 'https://img/1.jpg' },
      { id: 2, imageUrl: '' },
      { id: 3, imageUrl: 'https://img/3.jpg', isPrimary: true },
    ]);
    expect(photos.map((photo) => photo.id)).toEqual([3, 1]);
    expect(galleryPhotos(undefined)).toEqual([]);
  });

  it('arma la dirección y valida coordenadas', () => {
    expect(addressLines(null)).toBeNull();
    expect(
      addressLines({
        street: 'Av. México',
        exteriorNumber: '10',
        municipality: 'Tula',
        state: 'Hidalgo',
      }),
    ).toEqual(['Av. México 10', 'Tula, Hidalgo']);
    expect(hasCoordinates({ latitude: 20.6, longitude: -105.2 })).toBe(true);
    expect(hasCoordinates({ latitude: null, longitude: -105.2 })).toBe(false);
    expect(hasCoordinates({ latitude: 120, longitude: 0 })).toBe(false);
    expect(mapEmbedUrl({ latitude: 20, longitude: -105 })).toContain('marker=20%2C-105');
  });

  it('agrupa lugares cercanos por categoría', () => {
    const groups = groupNearbyPlaces([
      { id: 1, category: { name: 'Salud' } },
      { id: 2, category: null },
      { id: 3, category: { name: 'Salud' } },
    ]);
    expect(groups).toEqual([
      {
        category: 'Salud',
        items: [expect.objectContaining({ id: 1 }), expect.objectContaining({ id: 3 })],
      },
      { category: 'Otros', items: [expect.objectContaining({ id: 2 })] },
    ]);
  });

  it('convierte cada medio de contacto en un enlace útil', () => {
    expect(contactLink({ type: 'whatsapp', value: '322 123 4567' }, 'Casa').href).toMatch(
      /^https:\/\/wa\.me\/523221234567\?text=/,
    );
    expect(contactLink({ type: 'phone', value: '(322) 123-4567' }).href).toBe('tel:3221234567');
    expect(contactLink({ type: 'email', value: 'a@b.mx' }, 'Lote').href).toBe(
      'mailto:a@b.mx?subject=Inter%C3%A9s%20en%3A%20Lote',
    );
    expect(contactLink({ type: 'email', value: 'sin-arroba' }).href).toBeNull();
  });

  it('reconoce publicaciones no disponibles (404 y 410)', () => {
    expect(isUnavailableError({ status: 404 })).toBe(true);
    expect(isUnavailableError({ status: 410 })).toBe(true);
    expect(isUnavailableError({ status: 500 })).toBe(false);
    expect(isUnavailableError(null)).toBe(false);
  });
});

describe('resolveMediaUrl', () => {
  it('usa URL absolutas tal cual y sirve rutas relativas desde el servidor de la API', () => {
    expect(resolveMediaUrl('https://cdn.test/a.jpg')).toBe('https://cdn.test/a.jpg');
    expect(resolveMediaUrl('')).toBeNull();
    expect(resolveMediaUrl(null)).toBeNull();
    const expected = API_URL?.startsWith('http')
      ? `${new URL(API_URL).origin}/uploads/properties/a.jpg`
      : '/uploads/properties/a.jpg';
    expect(resolveMediaUrl('/uploads/properties/a.jpg')).toBe(expected);
  });
});

describe('servicios de la ficha pública y favoritos', () => {
  it('consulta el detalle y el contacto sin autenticación', async () => {
    const get = vi
      .spyOn(client, 'get')
      .mockResolvedValueOnce({ data: { property: { id: '1' } } })
      .mockResolvedValueOnce({ data: { contact: { type: 'email', value: 'a@b.mx' } } });

    await expect(getPublicProperty('1')).resolves.toEqual({ property: { id: '1' }, notes: {} });
    expect(get).toHaveBeenCalledWith('/properties/1', { skipAuth: true });
    await expect(getPropertyContact('1')).resolves.toEqual({ type: 'email', value: 'a@b.mx' });
    expect(get).toHaveBeenLastCalledWith('/properties/1/contact', { skipAuth: true });
  });

  it('lista, agrega y quita favoritos', async () => {
    vi.spyOn(client, 'get').mockResolvedValue({ data: {} });
    const post = vi.spyOn(client, 'post').mockResolvedValue({ data: { ok: true } });
    const del = vi.spyOn(client, 'delete').mockResolvedValue({ data: { ok: true } });

    await expect(listFavorites()).resolves.toEqual([]);
    await addFavorite('7');
    await removeFavorite('7');
    expect(post).toHaveBeenCalledWith('/favorites/7');
    expect(del).toHaveBeenCalledWith('/favorites/7');
  });
});

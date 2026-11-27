import { describe, expect, it } from 'vitest';
import { favoritesReducer, initialFavoritesState } from '@/context/favoritesState';
import { favoriteAvailability, favoriteKey, normalizeFavorite } from '@/utils/favorites';

describe('HU-030 · disponibilidad de un favorito', () => {
  it('una propiedad activa, o sin estado informado, está disponible', () => {
    expect(favoriteAvailability({ propertyId: 1, status: 'active' }).available).toBe(true);
    expect(favoriteAvailability({ propertyId: 1 }).available).toBe(true);
    expect(favoriteAvailability(undefined).available).toBe(true);
  });

  it('inactive y withdrawn se marcan como no disponibles con su explicación', () => {
    const inactive = favoriteAvailability({ propertyId: 1, status: 'inactive' });
    const withdrawn = favoriteAvailability({ propertyId: 2, status: 'withdrawn' });

    expect(inactive).toMatchObject({ available: false, status: 'inactive' });
    expect(inactive.note).toMatch(/desactiv/);
    expect(withdrawn.available).toBe(false);
    expect(withdrawn.note).toMatch(/retir/);
  });

  it('un estado desconocido distinto de active no se considera disponible', () => {
    const result = favoriteAvailability({ propertyId: 1, status: 'draft' });
    expect(result.available).toBe(false);
    expect(result.note).toMatch(/ya no está publicada/);
  });

  it('una marca booleana explícita manda sobre el estado, plana o anidada', () => {
    expect(favoriteAvailability({ propertyId: 1, isAvailable: false }).available).toBe(false);
    expect(favoriteAvailability({ propertyId: 1, available: true, status: 'x' }).available).toBe(
      true,
    );
    expect(
      favoriteAvailability({ propertyId: 1, property: { status: 'withdrawn' } }).available,
    ).toBe(false);
  });
});

describe('HU-030 · normalizeFavorite', () => {
  it('lee los campos planos y da formato a precio, ubicación y tipo', () => {
    const favorite = normalizeFavorite({
      propertyId: 9,
      title: '  Casa con jardín  ',
      propertyType: { id: 2, name: 'Casa' },
      publicationPrice: '1500000.00',
      location: { municipality: 'Tula de Allende', state: 'Hidalgo' },
      primaryPhoto: { imageUrl: 'https://img.test/a.jpg' },
      status: 'active',
    });

    expect(favorite).toMatchObject({
      propertyId: '9',
      title: 'Casa con jardín',
      propertyType: 'Casa',
      location: 'Tula de Allende, Hidalgo',
      photoUrl: 'https://img.test/a.jpg',
    });
    expect(favorite.price).toContain('1,500,000');
    expect(favorite.availability.available).toBe(true);
  });

  it('también acepta los datos anidados en `property`', () => {
    const favorite = normalizeFavorite({
      id: 3,
      propertyId: '9',
      property: { title: 'Terreno', price: 500000, municipality: 'Tepeji', state: 'Hidalgo' },
    });

    expect(favorite.title).toBe('Terreno');
    expect(favorite.location).toBe('Tepeji, Hidalgo');
    expect(favorite.propertyId).toBe('9');
  });

  it('con datos incompletos usa textos de respaldo, sin romperse', () => {
    const favorite = normalizeFavorite({ propertyId: 5 });

    expect(favorite.title).toBe('Propiedad #5');
    expect(favorite.propertyType).toBe('Propiedad');
    expect(favorite.location).toBe('Ubicación no disponible');
    expect(favorite.price).toBe('Precio por consultar');
    expect(favorite.photoUrl).toBeNull();
  });

  it('favoriteKey iguala números y textos', () => {
    expect(favoriteKey(7)).toBe(favoriteKey('7'));
    expect(favoriteKey(null)).toBe('');
  });
});

describe('HU-030 · reductor de favoritos', () => {
  const A = { propertyId: 1, title: 'A' };
  const B = { propertyId: '2', title: 'B' };
  const C = { propertyId: 3, title: 'C' };
  const ready = favoritesReducer(initialFavoritesState, { type: 'loadSuccess', items: [A, B] });

  it('carga la lista y marca la pantalla como cargada', () => {
    expect(ready).toMatchObject({ loaded: true, loading: false, items: [A, B] });
  });

  it('guardar muestra el elemento al instante, al inicio, y marca la petición en curso', () => {
    const next = favoritesReducer(ready, {
      type: 'mutateStart',
      id: '3',
      kind: 'adding',
      entry: C,
      index: 0,
    });

    expect(next.items).toEqual([C, A, B]);
    expect(next.busy).toEqual({ 3: 'adding' });
    expect(favoritesReducer(next, { type: 'mutateSuccess', id: '3' }).busy).toEqual({});
  });

  it('si guardar falla, se revierte y queda el mensaje de error', () => {
    const started = favoritesReducer(ready, {
      type: 'mutateStart',
      id: '3',
      kind: 'adding',
      entry: C,
      index: 0,
    });
    const failed = favoritesReducer(started, {
      type: 'mutateFailure',
      id: '3',
      kind: 'adding',
      entry: C,
      index: 0,
      message: 'Falló',
    });

    expect(failed.items).toEqual([A, B]);
    expect(failed.busy).toEqual({});
    expect(failed.errors).toEqual({ 3: 'Falló' });
  });

  it('quitar lo retira al instante y, si falla, lo devuelve a su posición original', () => {
    const started = favoritesReducer(ready, {
      type: 'mutateStart',
      id: '1',
      kind: 'removing',
      entry: A,
      index: 0,
    });
    expect(started.items).toEqual([B]);

    const failed = favoritesReducer(started, {
      type: 'mutateFailure',
      id: '1',
      kind: 'removing',
      entry: A,
      index: 0,
      message: 'Falló',
    });
    expect(failed.items).toEqual([A, B]);
    expect(failed.errors['1']).toBe('Falló');
  });

  it('restaurar reinserta en la posición indicada (y no más allá del final)', () => {
    const without = favoritesReducer(ready, {
      type: 'mutateStart',
      id: '1',
      kind: 'removing',
      entry: A,
      index: 0,
    });
    const restored = favoritesReducer(without, {
      type: 'mutateStart',
      id: '1',
      kind: 'adding',
      entry: A,
      index: 99,
    });
    expect(restored.items).toEqual([B, A]);
  });

  it('empezar otra petición limpia el error anterior de esa propiedad', () => {
    const withError = favoritesReducer(ready, {
      type: 'mutateFailure',
      id: '1',
      kind: 'adding',
      entry: A,
      index: 0,
      message: 'x',
    });
    const retry = favoritesReducer(withError, {
      type: 'mutateStart',
      id: '1',
      kind: 'adding',
      entry: A,
      index: 0,
    });
    expect(retry.errors).toEqual({});
    expect(favoritesReducer(withError, { type: 'clearError', id: '1' }).errors).toEqual({});
  });

  it('una recarga no pisa lo que se está guardando ni resucita lo que se está quitando', () => {
    const saving = favoritesReducer(ready, {
      type: 'mutateStart',
      id: '3',
      kind: 'adding',
      entry: C,
      index: 0,
    });
    const both = favoritesReducer(saving, {
      type: 'mutateStart',
      id: '1',
      kind: 'removing',
      entry: A,
      index: 1,
    });
    // El servidor todavía lista A y aún no conoce C.
    const reloaded = favoritesReducer(both, { type: 'loadSuccess', items: [A, B] });

    expect(reloaded.items).toEqual([C, B]);
  });

  it('un error de carga conserva lo ya cargado; reset deja todo en blanco', () => {
    const failed = favoritesReducer(ready, { type: 'loadFailure', message: 'sin red' });
    expect(failed).toMatchObject({ loaded: true, loadError: 'sin red', items: [A, B] });
    expect(favoritesReducer(failed, { type: 'reset' })).toBe(initialFavoritesState);
    expect(favoritesReducer(failed, { type: 'desconocida' })).toBe(failed);
  });
});

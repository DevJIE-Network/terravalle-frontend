import client from './client';

/*
 * Propiedades favoritas del usuario autenticado.
 *   GET    /favorites              → { favorites: [{ propertyId, title, ... }] }
 *   POST   /favorites/:propertyId  → 201 (nuevo) o 200 (ya existía)
 *   DELETE /favorites/:propertyId  → 200 (también si ya no existía)
 */

/** @returns {Promise<Array<{ id: string, propertyId: string, title: string }>>} */
export async function listFavorites() {
  const { data } = await client.get('/favorites');
  return data.favorites ?? [];
}

/** @param {string|number} propertyId */
export async function addFavorite(propertyId) {
  const { data } = await client.post(`/favorites/${propertyId}`);
  return data;
}

/** @param {string|number} propertyId */
export async function removeFavorite(propertyId) {
  const { data } = await client.delete(`/favorites/${propertyId}`);
  return data;
}

import client from './client';

/*
 * HU-024 · Administrar mis propiedades publicadas.
 * Consume las operaciones de HU-008 (todas requieren sesión y verifican al propietario):
 *
 *   GET    /properties/mine            → { properties: [...], pagination: { page, limit, total, totalPages } }
 *   PATCH  /properties/:id             → { message, property }  (title, propertyTypeId, description, publicationPrice)
 *   PATCH  /properties/:id/status      → { message, property }  con { status: 'active' | 'inactive', reason? }
 *   DELETE /properties/:id             → { message, property }  (retiro lógico y definitivo)
 *
 * El detalle de una propiedad propia (GET /properties/mine/:id) es `getMyProperty`.
 * Errores: 403 propiedad ajena, 404 inexistente, 409 cambio de estado no permitido.
 * OJO: la forma exacta de la lista y de las respuestas de estado se asumió; si el backend
 * difiere, se ajusta SOLO aquí.
 */

/**
 * Lista las propiedades del usuario autenticado (incluye las retiradas).
 * El dueño sale del token: nunca se envía un id de usuario.
 * @param {{ status?: string, page?: number, limit?: number }} [params]
 * @returns {Promise<{ properties: object[], pagination: object|null }>}
 */
export async function listMyProperties(params = {}) {
  const { data } = await client.get('/properties/mine', { params });
  return { properties: data.properties ?? [], pagination: data.pagination ?? null };
}

/**
 * Edición parcial de los campos permitidos (solo se envía lo que cambió).
 * @param {string} propertyId
 * @param {{ title?: string, propertyTypeId?: number, description?: string|null, publicationPrice?: number|null }} changes
 * @returns {Promise<{ message?: string, property: object }>}
 */
export async function updateProperty(propertyId, changes) {
  const { data } = await client.patch(`/properties/${propertyId}`, changes);
  return data;
}

/**
 * Activa o desactiva una propiedad propia (afecta si aparece como disponible).
 * @param {string} propertyId
 * @param {'active'|'inactive'} status
 * @param {string} [reason]
 * @returns {Promise<object|null>} la propiedad actualizada, si el backend la devuelve
 */
export async function changePropertyStatus(propertyId, status, reason) {
  const body = reason ? { status, reason } : { status };
  const { data } = await client.patch(`/properties/${propertyId}/status`, body);
  return data.property ?? null;
}

/**
 * Retira una propiedad de forma lógica y definitiva (no se puede reactivar ni editar).
 * @param {string} propertyId
 * @returns {Promise<object|null>} la propiedad retirada, si el backend la devuelve
 */
export async function withdrawProperty(propertyId) {
  const { data } = await client.delete(`/properties/${propertyId}`);
  return data.property ?? null;
}

import client from './client';

/**
 * Servicio de estimación orientativa del valor.
 * Solo funciona sobre propiedades del usuario autenticado.
 */

/**
 * La estimación puede tardar más que una petición normal (comparables y explicación con IA),
 * así que se le da más tiempo que los 15 s del cliente.
 */
export const ESTIMATION_TIMEOUT_MS = 30000;

/**
 * Solicita una nueva estimación de la propiedad.
 * Si faltan datos, el error trae `status: 422` y `details.missing` con lo que se debe completar.
 * @param {string} propertyId
 * @returns {Promise<{ message: string, estimation: object, publicationPrice: number|null, note: string }>}
 */
export async function requestEstimation(propertyId) {
  const { data } = await client.post(`/properties/${propertyId}/estimations`, null, {
    timeout: ESTIMATION_TIMEOUT_MS,
  });
  return data;
}

/**
 * Historial de estimaciones de la propiedad (la más reciente primero).
 * @param {string} propertyId
 * @returns {Promise<{ estimations: object[], disclaimer: string }>}
 */
export async function getEstimations(propertyId) {
  const { data } = await client.get(`/properties/${propertyId}/estimations`);
  return data;
}

/** Detalle de una propiedad propia (HU-008). Vive en property.service; se reexporta aquí. */
export { getMyProperty } from './property.service';

/**
 * Define el precio final de publicación (HU-008). Es independiente del valor estimado.
 * @param {string} propertyId
 * @param {number|null} publicationPrice
 * @returns {Promise<object>} la propiedad actualizada
 */
export async function updatePublicationPrice(propertyId, publicationPrice) {
  const { data } = await client.patch(`/properties/${propertyId}`, { publicationPrice });
  return data.property;
}

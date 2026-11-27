/*
 * HU-030 · Favoritos: lógica pura (sin React) para poder probarla por separado.
 *
 * Contrato de HU-014 (GET /favorites): cada elemento trae `propertyId` y los datos básicos de la
 * propiedad. Toda lectura de esos campos pasa por normalizeFavorite(): si el backend cambia un
 * nombre de campo, solo se ajusta este archivo.
 */
import {
  formatMxnPrice,
  getPublicPhotoUrl,
  getPublicPropertyType,
  summarizePropertyLocation,
} from './publicProperties';

/** Identificador comparable: el API puede enviarlo como número o como texto. */
export const favoriteKey = (propertyId) => String(propertyId ?? '');

/**
 * Política de disponibilidad del listado de favoritos (HU-030):
 * una propiedad que dejó de estar publicada NO se borra de la lista. Se conserva, marcada como
 * "No disponible" y sin enlace a su ficha (que respondería 404/410). El usuario puede quitarla.
 *
 * Estados de una propiedad en el backend: draft, active, inactive y withdrawn.
 * Solo `active` está disponible. Si el elemento no informa su estado, se considera disponible.
 */
const UNAVAILABLE_NOTES = {
  inactive: 'El vendedor la desactivó. Puede volver a publicarse más adelante.',
  withdrawn: 'El vendedor la retiró y ya no está publicada.',
};
const DEFAULT_UNAVAILABLE_NOTE = 'Esta propiedad ya no está publicada.';

/**
 * @param {object} entry Elemento de GET /favorites.
 * @returns {{ available: boolean, status: string|null, note: string }}
 */
export function favoriteAvailability(entry) {
  const data = { ...entry, ...entry?.property };
  const flag = data.available ?? data.isAvailable;
  const rawStatus = data.status ?? data.propertyStatus;
  const status = typeof rawStatus === 'string' && rawStatus.trim() ? rawStatus.trim() : null;

  let available = true;
  if (typeof flag === 'boolean') available = flag;
  else if (status !== null) available = status === 'active';

  return {
    available,
    status,
    note: available ? '' : (UNAVAILABLE_NOTES[status] ?? DEFAULT_UNAVAILABLE_NOTE),
  };
}

/**
 * Datos listos para mostrar de un favorito. Acepta los campos planos o anidados en `property`.
 * @returns {{
 *   propertyId: string, title: string, propertyType: string, location: string,
 *   price: string, photoUrl: string|null,
 *   availability: { available: boolean, status: string|null, note: string },
 * }}
 */
export function normalizeFavorite(entry) {
  const data = { ...entry, ...entry?.property };
  const propertyId = favoriteKey(entry?.propertyId ?? data.id);
  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : null;

  return {
    propertyId,
    title: title ?? `Propiedad #${propertyId}`,
    propertyType: getPublicPropertyType(data.propertyType),
    location: summarizePropertyLocation(
      data.location ?? { municipality: data.municipality, state: data.state },
    ),
    price: formatMxnPrice(data.publicationPrice ?? data.price),
    photoUrl: getPublicPhotoUrl(data.primaryPhoto ?? data.photoUrl ?? data.imageUrl),
    availability: favoriteAvailability(entry),
  };
}

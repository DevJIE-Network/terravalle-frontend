import client from './client';

export async function createProperty(payload) {
  const { data } = await client.post('/properties', payload);

  return data;
}

export async function uploadPropertyPhotos(propertyId, photos, onProgress) {
  const formData = new FormData();

  const primaryIndex = photos.findIndex((photo) => photo.isPrimary);

  photos.forEach((photo) => {
    formData.append('photos', photo.file);
  });

  formData.append('primaryIndex', String(primaryIndex >= 0 ? primaryIndex : 0));

  const { data } = await client.post(`/properties/${propertyId}/photos`, formData, {
    onUploadProgress(event) {
      if (!event.total) {
        return;
      }

      const percentage = Math.round((event.loaded * 100) / event.total);

      onProgress?.(percentage);
    },
  });

  return data;
}

/*
 * HU-021 · Dimensiones y características de construcción.
 *
 * Operaciones de HU-005. OJO: el contrato exacto (rutas y nombres de campos) se asumió
 * porque no viene en el repositorio; si el backend usa otros, se ajusta SOLO aquí.
 *
 *   GET /properties/:id/dimensions → { dimensions: {...} | null }
 *   PUT /properties/:id/dimensions → { message, dimensions: {...} }
 *
 * Campos: landArea, frontage, depth, hasConstruction, builtArea, bedrooms,
 * bathrooms, floors, parkingSpaces, age, condition.
 */

/**
 * Obtiene las dimensiones registradas de una propiedad propia.
 * Si aún no se capturan, devuelve `null` (un 404 de este recurso se toma como "sin datos").
 * @param {string} propertyId
 * @returns {Promise<object|null>}
 */
export async function getPropertyDimensions(propertyId) {
  try {
    const { data } = await client.get(`/properties/${propertyId}/dimensions`);
    return data.dimensions ?? null;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

/**
 * Guarda (crea o reemplaza) las dimensiones de una propiedad propia.
 * @param {string} propertyId
 * @param {object} payload Ver `toDimensionsPayload` en `@/utils/propertyDimensions`.
 * @returns {Promise<{ message?: string, dimensions: object }>}
 */
export async function savePropertyDimensions(propertyId, payload) {
  const { data } = await client.put(`/properties/${propertyId}/dimensions`, payload);
  return data;
}

/*
 * HU-022 · Servicios disponibles en la propiedad.
 * Consume las operaciones de HU-006:
 *
 *   GET /services                → { services: [{ id, name, description }] } (catálogo, público)
 *   GET /properties/:id/services → { services: [...] } (selección vigente, solo el dueño)
 *   PUT /properties/:id/services → { message, services: [...] } con { serviceIds: number[] }
 */

/**
 * Detalle de una propiedad propia (HU-008). El backend responde 404/403 si no es del usuario.
 * @param {string} propertyId
 * @returns {Promise<object>}
 */
export async function getMyProperty(propertyId) {
  const { data } = await client.get(`/properties/mine/${propertyId}`);
  return data.property;
}

/**
 * Catálogo de servicios de TerraValle (solo los activos).
 * @returns {Promise<Array<{ id: number, name: string, description: string|null }>>}
 */
export async function getServiceCatalog() {
  const { data } = await client.get('/services');
  return data.services ?? [];
}

/**
 * Servicios registrados actualmente en una propiedad propia.
 * @param {string} propertyId
 * @returns {Promise<Array<{ id: number, name: string, description: string|null }>>}
 */
export async function getPropertyServices(propertyId) {
  const { data } = await client.get(`/properties/${propertyId}/services`);
  return data.services ?? [];
}

/**
 * Reemplaza la selección COMPLETA de servicios de una propiedad propia
 * (lo que no se envía se desmarca; un arreglo vacío quita todos).
 * @param {string} propertyId
 * @param {number[]} serviceIds
 * @returns {Promise<{ message?: string, services: object[] }>}
 */
export async function savePropertyServices(propertyId, serviceIds) {
  const { data } = await client.put(`/properties/${propertyId}/services`, { serviceIds });
  return data;
}

// HU-023 · Ubicación y puntos cercanos: /properties/:id/location, /nearby-place-*

/** Ubicación principal de la propiedad (null si aún no se registra). */
export async function getPropertyLocation(propertyId) {
  try {
    const { data } = await client.get(`/properties/${propertyId}/location`);
    return data.location ?? null;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

export async function savePropertyLocation(propertyId, payload) {
  const { data } = await client.put(`/properties/${propertyId}/location`, payload);
  return data;
}

/** Catálogo de categorías de puntos cercanos (ej. Hospital, Escuela). */
export async function getNearbyPlaceCategories() {
  const { data } = await client.get('/properties/nearby-place-categories');
  return data.categories ?? [];
}

export async function getNearbyPlaces(propertyId) {
  const { data } = await client.get(`/properties/${propertyId}/nearby-places`);
  return data.nearbyPlaces ?? [];
}

export async function createNearbyPlace(propertyId, payload) {
  const { data } = await client.post(`/properties/${propertyId}/nearby-places`, payload);
  return data;
}

export async function deleteNearbyPlace(propertyId, placeId) {
  const { data } = await client.delete(`/properties/${propertyId}/nearby-places/${placeId}`);
  return data;
}

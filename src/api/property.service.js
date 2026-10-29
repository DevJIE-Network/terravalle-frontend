import client from './client';

export async function createProperty(
  payload,
) {
  const { data } =
    await client.post(
      '/properties',
      payload,
    );

  return data;
}

export async function uploadPropertyPhotos(
  propertyId,
  photos,
  onProgress,
) {
  const formData =
    new FormData();

  const primaryIndex =
    photos.findIndex(
      (photo) =>
        photo.isPrimary,
    );

  photos.forEach((photo) => {
    formData.append(
      'photos',
      photo.file,
    );
  });

  formData.append(
    'primaryIndex',
    String(
      primaryIndex >= 0
        ? primaryIndex
        : 0,
    ),
  );

  const { data } =
    await client.post(
      `/properties/${propertyId}/photos`,
      formData,
      {
        onUploadProgress(
          event,
        ) {
          if (!event.total) {
            return;
          }

          const percentage =
            Math.round(
              (event.loaded *
                100) /
                event.total,
            );

          onProgress?.(
            percentage,
          );
        },
      },
    );

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

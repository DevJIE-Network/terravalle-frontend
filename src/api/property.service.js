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
import { useState } from 'react';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 10;

function formatFileSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function PhotoUploader({
  photos,
  setPhotos,
  disabled = false,
}) {
  const [error, setError] = useState('');

  function handleFiles(event) {
    const selectedFiles = Array.from(
      event.target.files || [],
    );

    setError('');

    if (!selectedFiles.length) {
      return;
    }

    const availableSlots =
      MAX_IMAGES - photos.length;

    if (availableSlots <= 0) {
      setError(
        `Puedes seleccionar un máximo de ${MAX_IMAGES} fotografías.`,
      );
      event.target.value = '';
      return;
    }

    const acceptedFiles = [];
    const rejectedMessages = [];

    for (const file of selectedFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        rejectedMessages.push(
          `${file.name}: formato no permitido.`,
        );
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        rejectedMessages.push(
          `${file.name}: supera el límite de 5 MB.`,
        );
        continue;
      }

      if (acceptedFiles.length >= availableSlots) {
        rejectedMessages.push(
          `${file.name}: se alcanzó el máximo de ${MAX_IMAGES} fotografías.`,
        );
        continue;
      }

      acceptedFiles.push(file);
    }

    const newPhotos = acceptedFiles.map(
      (file, index) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        isPrimary:
          photos.length === 0 && index === 0,
      }),
    );

    setPhotos((current) => [
      ...current,
      ...newPhotos,
    ]);

    if (rejectedMessages.length) {
      setError(rejectedMessages.join(' '));
    }

    event.target.value = '';
  }

  function removePhoto(id) {
    setPhotos((current) => {
      const photoToRemove = current.find(
        (photo) => photo.id === id,
      );

      if (photoToRemove) {
        URL.revokeObjectURL(
          photoToRemove.previewUrl,
        );
      }

      const remaining = current.filter(
        (photo) => photo.id !== id,
      );

      const removedWasPrimary =
        photoToRemove?.isPrimary;

      if (
        removedWasPrimary &&
        remaining.length > 0
      ) {
        return remaining.map(
          (photo, index) => ({
            ...photo,
            isPrimary: index === 0,
          }),
        );
      }

      return remaining;
    });
  }

  function setPrimaryPhoto(id) {
    setPhotos((current) =>
      current.map((photo) => ({
        ...photo,
        isPrimary: photo.id === id,
      })),
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          Fotografías
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Agrega fotografías de la propiedad.
          Puedes seleccionar hasta {MAX_IMAGES}.
        </p>
      </div>

      <label
        className={`
          flex cursor-pointer flex-col items-center
          justify-center rounded-xl border-2
          border-dashed border-gray-300 p-8
          text-center transition
          hover:border-gray-400
          ${
            disabled
              ? 'cursor-not-allowed opacity-50'
              : ''
          }
        `}
      >
        <span className="font-medium">
          Seleccionar fotografías
        </span>

        <span className="mt-1 text-sm text-gray-500">
          JPG, PNG o WebP · máximo 5 MB por imagen
        </span>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled}
          onChange={handleFiles}
          className="hidden"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="text-sm text-red-600"
        >
          {error}
        </p>
      )}

      {photos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <article
              key={photo.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={photo.previewUrl}
                  alt={`Vista previa de ${photo.file.name}`}
                  className="h-full w-full object-cover"
                />

                {photo.isPrimary && (
                  <span className="absolute left-2 top-2 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow">
                    Principal
                  </span>
                )}
              </div>

              <div className="space-y-3 p-3">
                <div>
                  <p className="truncate text-sm font-medium">
                    {photo.file.name}
                  </p>

                  <p className="text-xs text-gray-500">
                    {formatFileSize(
                      photo.file.size,
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!photo.isPrimary && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        setPrimaryPhoto(photo.id)
                      }
                      className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Hacer principal
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      removePhoto(photo.id)
                    }
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
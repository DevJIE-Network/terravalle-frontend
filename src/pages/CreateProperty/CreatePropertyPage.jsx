import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  createProperty,
  uploadPropertyPhotos,
} from '@/api/property.service';

import { PhotoUploader } from '@/components/property';

import {
  Alert,
  Button,
  Input,
  PageHeader,
} from '@/components/ui';

import { ROUTES } from '@/utils/constants';

const PROPERTY_TYPES = [
  { id: 1, name: 'Terreno' },
  { id: 2, name: 'Casa' },
  { id: 3, name: 'Departamento' },
  { id: 4, name: 'Otro' },
];

const INITIAL_FORM = {
  title: '',
  propertyTypeId: '',
  description: '',
  publicationPrice: '',
};

export default function CreatePropertyPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [photos, setPhotos] = useState([]);

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] =
    useState('');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [uploadProgress, setUploadProgress] =
    useState(0);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));
  }

  function validate() {
    const nextErrors = {};

    const title = form.title.trim();

    if (!title) {
      nextErrors.title =
        'El título es obligatorio.';
    } else if (title.length < 3) {
      nextErrors.title =
        'El título debe tener al menos 3 caracteres.';
    } else if (title.length > 150) {
      nextErrors.title =
        'El título no puede superar los 150 caracteres.';
    }

    if (!form.propertyTypeId) {
      nextErrors.propertyTypeId =
        'Selecciona un tipo de propiedad.';
    }

    if (
      form.description.trim().length >
      3000
    ) {
      nextErrors.description =
        'La descripción no puede superar los 3000 caracteres.';
    }

    if (form.publicationPrice !== '') {
      const price = Number(
        form.publicationPrice,
      );

      if (Number.isNaN(price)) {
        nextErrors.publicationPrice =
          'Ingresa un precio válido.';
      } else if (price < 0) {
        nextErrors.publicationPrice =
          'El precio no puede ser negativo.';
      }
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  }

  function releasePhotoPreviews() {
    photos.forEach((photo) => {
      if (photo.previewUrl) {
        URL.revokeObjectURL(
          photo.previewUrl,
        );
      }
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setGeneralError('');
    setUploadProgress(0);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      /*
       * PASO 1
       * Crear la propiedad.
       */
      const payload = {
        title: form.title.trim(),

        propertyTypeId: Number(
          form.propertyTypeId,
        ),

        description:
          form.description.trim(),
      };

      if (
        form.publicationPrice !== ''
      ) {
        payload.publicationPrice =
          Number(
            form.publicationPrice,
          );
      }

      const response =
        await createProperty(payload);

      const propertyId =
        response.property?.id;

      if (!propertyId) {
        throw new Error(
          'La propiedad fue creada, pero no se recibió su identificador.',
        );
      }

      /*
       * PASO 2
       * Subir fotografías si existen.
       */
      if (photos.length > 0) {
        await uploadPropertyPhotos(
          propertyId,
          photos,
          setUploadProgress,
        );
      }

      /*
       * Liberamos las URLs temporales
       * utilizadas para las vistas previas.
       */
      releasePhotoPreviews();

      /*
       * PASO 3
       * Regresar al panel.
       *
       * Posteriormente podemos cambiar
       * esta navegación para ir
       * directamente a HU-021.
       */
      void navigate(
        ROUTES.MY_PROPERTIES,
        {
          replace: true,

          state: {
            message:
              'Propiedad registrada correctamente. Puedes continuar completando su información.',

            propertyId,
          },
        },
      );
    } catch (error) {
      /*
       * Errores de validación enviados
       * por el backend.
       */
      if (
        error.status === 400 &&
        Array.isArray(
          error.details,
        )
      ) {
        const backendErrors = {};

        for (
          const item of error.details
        ) {
          if (item.field) {
            backendErrors[
              item.field
            ] = item.message;
          }
        }

        setErrors((current) => ({
          ...current,
          ...backendErrors,
        }));
      }

      setGeneralError(
        error.message ||
          'No fue posible registrar la propiedad.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Registrar propiedad"
        description="Agrega los datos generales y las fotografías de tu propiedad. Podrás completar el resto de la información posteriormente."
      />

      {generalError && (
        <div className="mb-6">
          <Alert
            variant="error"
            onClose={() =>
              setGeneralError('')
            }
          >
            {generalError}
          </Alert>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-2xl bg-white p-6 shadow-sm"
        noValidate
      >
        {/* ========================= */}
        {/* DATOS GENERALES */}
        {/* ========================= */}

        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">
              Datos generales
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Ingresa la información
              principal de la propiedad.
            </p>
          </div>

          <Input
            id="title"
            name="title"
            label="Título de la publicación"
            value={form.title}
            onChange={handleChange}
            error={errors.title}
            placeholder="Ej. Casa en venta en Tepeji"
            disabled={
              isSubmitting
            }
          />

          {/* Tipo de propiedad */}
          <div>
            <label
              htmlFor="propertyTypeId"
              className="mb-2 block text-sm font-medium"
            >
              Tipo de propiedad
            </label>

            <select
              id="propertyTypeId"
              name="propertyTypeId"
              value={
                form.propertyTypeId
              }
              onChange={
                handleChange
              }
              disabled={
                isSubmitting
              }
              aria-invalid={Boolean(
                errors.propertyTypeId,
              )}
              className={`w-full rounded-lg border px-3 py-2 outline-none transition focus:ring-2 ${
                errors.propertyTypeId
                  ? 'border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:ring-green-200'
              }`}
            >
              <option value="">
                Selecciona una opción
              </option>

              {PROPERTY_TYPES.map(
                (type) => (
                  <option
                    key={type.id}
                    value={type.id}
                  >
                    {type.name}
                  </option>
                ),
              )}
            </select>

            {errors.propertyTypeId && (
              <p className="mt-1 text-sm text-red-600">
                {
                  errors.propertyTypeId
                }
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium"
            >
              Descripción
            </label>

            <textarea
              id="description"
              name="description"
              value={
                form.description
              }
              onChange={
                handleChange
              }
              disabled={
                isSubmitting
              }
              rows={5}
              maxLength={3000}
              placeholder="Describe brevemente la propiedad..."
              className={`w-full resize-y rounded-lg border px-3 py-2 outline-none transition focus:ring-2 ${
                errors.description
                  ? 'border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:ring-green-200'
              }`}
            />

            <div className="mt-1 flex justify-between gap-4">
              {errors.description ? (
                <p className="text-sm text-red-600">
                  {
                    errors.description
                  }
                </p>
              ) : (
                <span />
              )}

              <p className="text-xs text-gray-500">
                {
                  form.description
                    .length
                }
                /3000
              </p>
            </div>
          </div>

          {/* Precio */}
          <Input
            id="publicationPrice"
            name="publicationPrice"
            type="number"
            min="0"
            step="0.01"
            label="Precio de publicación"
            value={
              form.publicationPrice
            }
            onChange={
              handleChange
            }
            error={
              errors.publicationPrice
            }
            hint="Puedes dejarlo vacío y definirlo después."
            placeholder="Ej. 1450000"
            disabled={
              isSubmitting
            }
          />
        </section>

        <hr className="border-gray-200" />

        {/* ========================= */}
        {/* FOTOGRAFÍAS */}
        {/* ========================= */}

        <PhotoUploader
          photos={photos}
          setPhotos={setPhotos}
          disabled={
            isSubmitting
          }
        />

        {/* ========================= */}
        {/* PROGRESO DE CARGA */}
        {/* ========================= */}

        {isSubmitting &&
          photos.length > 0 &&
          uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  Subiendo
                  fotografías...
                </span>

                <span>
                  {uploadProgress}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-green-700 transition-all duration-300"
                  style={{
                    width: `${uploadProgress}%`,
                  }}
                />
              </div>
            </div>
          )}

        {/* ========================= */}
        {/* INFORMACIÓN BORRADOR */}
        {/* ========================= */}

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            La propiedad se guardará
            inicialmente como borrador.
            Después podrás completar sus
            dimensiones, servicios y
            ubicación antes de
            publicarla.
          </p>
        </div>

        {/* ========================= */}
        {/* BOTONES */}
        {/* ========================= */}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={
              isSubmitting
            }
            onClick={() => {
              void navigate(
                ROUTES.MY_PROPERTIES,
              );
            }}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            loading={
              isSubmitting
            }
            disabled={
              isSubmitting
            }
          >
            {isSubmitting
              ? 'Guardando...'
              : 'Guardar propiedad'}
          </Button>
        </div>
      </form>
    </section>
  );
}
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMyProperty, getPropertyLocation, savePropertyLocation } from '@/api';
import {
  Alert,
  Button,
  Card,
  ErrorState,
  Input,
  Loader,
  PageHeader,
} from '@/components/ui';
import { useUnsavedChanges } from '@/hooks';
import {
  ROUTES,
  buildPropertyEditPath,
} from '@/utils/constants';
import { cn } from '@/utils/helpers';
import {
  LOCATION_DISCLAIMER,
  LOCATION_TEXT_MAX,
  EMPTY_LOCATION_FORM,
  formFromLocation,
  locationFormHasChanges,
  toLocationPayload,
  validateLocationForm,
} from '@/utils/propertyLocation';
import LocationMapPanel from './LocationMapPanel';
import NearbyPlacesSection from './NearbyPlacesSection';

/* ------------------------------------------------------------------ */
/* Formulario de ubicación                                             */
/* ------------------------------------------------------------------ */

function LocationForm({ form, errors, propertyId, isSaving, saveFailed, onChange, onSubmit }) {
  const disabled = isSaving;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Card title="Ubicación de la propiedad">
        <p className="text-ink-muted mb-4 text-sm">{LOCATION_DISCLAIMER}</p>

        <fieldset className="flex flex-col gap-4" disabled={disabled}>
          <legend className="text-ink mb-2 text-sm font-semibold">Dirección</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="street"
              name="street"
              label="Calle"
              value={form.street}
              onChange={onChange}
              error={errors.street}
              disabled={disabled}
              maxLength={LOCATION_TEXT_MAX.street}
            />
            <Input
              id="exteriorNumber"
              name="exteriorNumber"
              label="No. ext."
              value={form.exteriorNumber}
              onChange={onChange}
              error={errors.exteriorNumber}
              disabled={disabled}
              maxLength={LOCATION_TEXT_MAX.exteriorNumber}
            />
            <Input
              id="interiorNumber"
              name="interiorNumber"
              label="No. int. (opcional)"
              value={form.interiorNumber}
              onChange={onChange}
              error={errors.interiorNumber}
              disabled={disabled}
              maxLength={LOCATION_TEXT_MAX.interiorNumber}
            />
          </div>

          <Input
            id="neighborhood"
            name="neighborhood"
            label="Colonia o barrio"
            value={form.neighborhood}
            onChange={onChange}
            error={errors.neighborhood}
            disabled={disabled}
            maxLength={LOCATION_TEXT_MAX.neighborhood}
          />
        </fieldset>

        <fieldset className="mt-6 flex flex-col gap-4" disabled={disabled}>
          <legend className="text-ink mb-2 text-sm font-semibold">Localidad</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="municipality"
              name="municipality"
              label="Municipio o localidad"
              value={form.municipality}
              onChange={onChange}
              error={errors.municipality}
              disabled={disabled}
              maxLength={LOCATION_TEXT_MAX.municipality}
            />
            <Input
              id="state"
              name="state"
              label="Estado"
              value={form.state}
              onChange={onChange}
              error={errors.state}
              disabled={disabled}
              maxLength={LOCATION_TEXT_MAX.state}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="postalCode"
              name="postalCode"
              label="Código postal"
              value={form.postalCode}
              onChange={onChange}
              error={errors.postalCode}
              disabled={disabled}
              maxLength={LOCATION_TEXT_MAX.postalCode}
            />
            <Input
              id="country"
              name="country"
              label="País"
              value={form.country}
              onChange={onChange}
              error={errors.country}
              hint="Déjalo vacío para usar México."
              disabled={disabled}
              maxLength={LOCATION_TEXT_MAX.country}
            />
          </div>
        </fieldset>

        <fieldset className="mt-6 flex flex-col gap-4" disabled={disabled}>
          <legend className="text-ink mb-2 text-sm font-semibold">Coordenadas</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="latitude"
              name="latitude"
              label="Latitud"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={form.latitude}
              onChange={onChange}
              error={errors.latitude}
              disabled={disabled}
            />
            <Input
              id="longitude"
              name="longitude"
              label="Longitud"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={form.longitude}
              onChange={onChange}
              error={errors.longitude}
              hint="Opcional. Si las escribes, van juntas."
              disabled={disabled}
            />
          </div>
        </fieldset>

        <div className="mt-6 flex flex-col gap-1.5">
          <label htmlFor="formattedAddress" className="text-ink text-sm font-medium">
            Dirección completa (referencia)
          </label>
          <textarea
            id="formattedAddress"
            name="formattedAddress"
            rows={3}
            value={form.formattedAddress}
            onChange={onChange}
            disabled={disabled}
            maxLength={LOCATION_TEXT_MAX.formattedAddress}
            aria-invalid={Boolean(errors.formattedAddress)}
            aria-describedby={errors.formattedAddress ? 'formattedAddress-error' : undefined}
            className={cn(
              'text-ink w-full resize-y rounded-lg border bg-white px-3 py-2 text-base focus:ring-2 focus:outline-none',
              'disabled:cursor-not-allowed disabled:bg-stone-100',
              errors.formattedAddress
                ? 'border-red-500 focus:ring-red-200'
                : 'focus:border-primary-500 focus:ring-primary-100 border-stone-300',
            )}
          />
          {errors.formattedAddress ? (
            <p id="formattedAddress-error" role="alert" className="text-sm text-red-600">
              {errors.formattedAddress}
            </p>
          ) : (
            <p className="text-ink-muted text-xs">
              Opcional. Alternativa a municipio y estado, o a las coordenadas.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" to={buildPropertyEditPath(propertyId)} disabled={disabled}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSaving}>
            {saveButtonLabel(isSaving, saveFailed)}
          </Button>
        </div>
      </Card>
    </form>
  );
}

function saveButtonLabel(isSaving, saveFailed) {
  if (isSaving) return 'Guardando...';
  return saveFailed ? 'Reintentar' : 'Guardar ubicación';
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

/**
 * HU-023 · Captura de la ubicación y consulta de servicios cercanos de una propiedad.
 * Ruta: /mis-propiedades/:id/ubicacion (solo el responsable de la publicación).
 * El propertyId SIEMPRE viene de la ruta: nunca lo escribe el usuario.
 */
export default function PropertyLocationPage() {
  const { id } = useParams();

  const [view, setView] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [loadError, setLoadError] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [property, setProperty] = useState(null);
  const [location, setLocation] = useState(null);
  const [baseline, setBaseline] = useState(EMPTY_LOCATION_FORM);
  const [form, setForm] = useState(EMPTY_LOCATION_FORM);
  const [errors, setErrors] = useState({});

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isDirty = locationFormHasChanges(form, baseline);
  useUnsavedChanges(isDirty && !isSaving);

  // La ubicación de propiedades ajenas responde 404 del servicio → null; aquí 
  // getMyProperty es quien marca si el usuario realmente es el responsable.
  useEffect(() => {
    let active = true;
    Promise.all([getMyProperty(id), getPropertyLocation(id)])
      .then(([loadedProperty, savedLocation]) => {
        if (!active) return;
        const loadedForm = formFromLocation(savedLocation);
        setProperty(loadedProperty);
        setLocation(savedLocation);
        setBaseline(loadedForm);
        setForm(loadedForm);
        setView('ready');
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error);
        setView('error');
      });
    return () => {
      active = false;
    };
  }, [id, loadAttempt]);

  function retryLoad() {
    setView('loading');
    setLoadError(null);
    setLoadAttempt((attempt) => attempt + 1);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSuccessMessage('');
    setSaveError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;

    setSaveError('');
    setSuccessMessage('');

    const found = validateLocationForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0 || !isDirty) return;

    try {
      setIsSaving(true);
      const response = await savePropertyLocation(id, toLocationPayload(form));
      const saved = response.location ?? null;
      const savedForm = formFromLocation(saved);

      setLocation(saved);
      setBaseline(savedForm);
      setForm(savedForm);
      setErrors({});
      setSuccessMessage(response.message ?? 'Ubicación guardada correctamente.');
    } catch (error) {
      // El formulario conserva lo escrito para poder corregir y reintentar.
      const items = Array.isArray(error.details?.errors) ? error.details.errors : null;
      if (items) {
        const backendErrors = {};
        for (const item of items) {
          if (item.field in EMPTY_LOCATION_FORM) backendErrors[item.field] = item.message;
        }
        setErrors((current) => ({ ...current, ...backendErrors }));
      }
      setSaveError(error.details?.message ?? error.message);
    } finally {
      setIsSaving(false);
    }
  }

  const denied = accessProblem(loadError);

  return (
    <section className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Ubicación y entorno"
        description={
          property
            ? `Captura la ubicación de «${property.title}» y revisa los puntos cercanos.`
            : 'Captura la ubicación de tu propiedad y revisa los puntos cercanos.'
        }
        actions={
          <Button variant="secondary" to={ROUTES.MY_PROPERTIES}>
            Mis propiedades
          </Button>
        }
      />

      {view === 'loading' && <Loader label="Cargando la ubicación..." className="py-16" />}

      {view === 'error' && (
        <ErrorState
          title={denied?.title ?? 'No pudimos cargar la ubicación'}
          message={denied?.message ?? loadError?.message}
          onRetry={denied ? undefined : retryLoad}
        />
      )}

      {view === 'ready' && (
        <div className="flex flex-col gap-6">
          {successMessage && (
            <Alert variant="success" onClose={() => setSuccessMessage('')}>
              {successMessage}
            </Alert>
          )}

          {saveError && (
            <Alert variant="error" title="No se pudo guardar la ubicación">
              <p>{saveError}</p>
              <p className="mt-1">Lo que escribiste sigue en pantalla; puedes corregirlo e intentarlo de nuevo.</p>
            </Alert>
          )}

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <LocationForm
              propertyId={id}
              form={form}
              errors={errors}
              isSaving={isSaving}
              saveFailed={Boolean(saveError)}
              onChange={handleChange}
              onSubmit={handleSubmit}
            />

            <LocationMapPanel location={location} />
          </div>

          <NearbyPlacesSection propertyId={id} />
        </div>
      )}
    </section>
  );
}

/** Textos del acceso denegado según el error del backend (sin mostrar datos ajenos). */
function accessProblem(error) {
  if (error?.status === 403) {
    return {
      title: 'Acceso denegado',
      message: 'No puedes administrar la ubicación de esta propiedad porque no te pertenece.',
    };
  }
  if (error?.status === 404) {
    return {
      title: 'Propiedad no encontrada',
      message: 'No encontramos esta propiedad. Puede que ya no exista o que no sea tuya.',
    };
  }
  return null;
}

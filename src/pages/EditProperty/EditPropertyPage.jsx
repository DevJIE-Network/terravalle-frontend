import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMyProperty, updateProperty } from '@/api';
import { Alert, Button, Card, ErrorState, Input, Loader, PageHeader } from '@/components/ui';
import { useUnsavedChanges } from '@/hooks';
import {
  PROPERTY_TYPES,
  ROUTES,
  buildPropertyDimensionsPath,
  buildPropertyEstimationPath,
  buildPropertyServicesPath,
} from '@/utils/constants';
import { cn, formatPrice } from '@/utils/helpers';
import { getStatusConfig, isEditable } from '@/utils/myProperties';
import {
  DESCRIPTION_MAX,
  EMPTY_EDIT_FORM,
  formFromProperty,
  hasChanges,
  toChanges,
  validateEditForm,
} from '@/utils/propertyEdit';
import StatusBadge from '@/pages/MyProperties/StatusBadge';

const EDITABLE_FIELDS = ['title', 'propertyTypeId', 'description', 'publicationPrice'];

/** Textos del acceso denegado según el error del backend (CA4: sin mostrar datos de la propiedad). */
function accessProblem(error) {
  if (error?.status === 403) {
    return {
      title: 'Acceso denegado',
      message: 'Esta propiedad no te pertenece, por eso no puedes ver ni editar su información.',
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

function SectionLinks({ propertyId }) {
  const links = [
    { to: buildPropertyDimensionsPath(propertyId), label: 'Dimensiones y construcción' },
    { to: buildPropertyServicesPath(propertyId), label: 'Servicios disponibles' },
    { to: buildPropertyEstimationPath(propertyId), label: 'Estimación del valor' },
  ];

  return (
    <Card title="Completar información">
      <ul className="flex flex-col gap-2 text-sm">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-primary-700 hover:text-primary-900 font-medium underline-offset-2 hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Datos vigentes de la publicación (se actualizan tras guardar). */
function CurrentData({ property }) {
  const status = getStatusConfig(property.status);
  const type = PROPERTY_TYPES.find((item) => String(item.id) === String(property.propertyTypeId));

  return (
    <Card title="Datos vigentes">
      <dl className="flex flex-col divide-y divide-stone-100 text-sm">
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt className="text-ink-muted">Estado</dt>
          <dd>
            <StatusBadge status={property.status} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt className="text-ink-muted">Visibilidad</dt>
          <dd className="text-ink text-right font-semibold">{status.visibility}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt className="text-ink-muted">Tipo</dt>
          <dd className="text-ink font-semibold">{type?.name ?? 'Sin definir'}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt className="text-ink-muted">Precio</dt>
          <dd className="text-ink font-semibold">
            {typeof property.publicationPrice === 'number'
              ? formatPrice(property.publicationPrice)
              : 'Sin definir'}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

/**
 * HU-024 · Edición de los datos generales de una propiedad propia.
 * Ruta: /mis-propiedades/:id/editar (solo el dueño). Si la propiedad es de otro usuario,
 * muestra "Acceso denegado" y NO presenta sus datos.
 */
export default function EditPropertyPage() {
  const { id } = useParams();

  const [view, setView] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [loadError, setLoadError] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [property, setProperty] = useState(null);
  const [baseline, setBaseline] = useState(EMPTY_EDIT_FORM);
  const [form, setForm] = useState(EMPTY_EDIT_FORM);
  const [errors, setErrors] = useState({});

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isDirty = hasChanges(form, baseline);
  useUnsavedChanges(isDirty && !isSaving);

  useEffect(() => {
    let active = true;
    getMyProperty(id)
      .then((loaded) => {
        if (!active) return;
        const loadedForm = formFromProperty(loaded);
        setProperty(loaded);
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
    if (isSaving || !isDirty) return;

    setSaveError('');
    setSuccessMessage('');

    const found = validateEditForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      setIsSaving(true);
      const response = await updateProperty(id, toChanges(form, baseline));
      const updated = { ...property, ...response.property };
      const updatedForm = formFromProperty(updated);

      setProperty(updated);
      setBaseline(updatedForm);
      setForm(updatedForm);
      setSuccessMessage(response.message ?? 'Los cambios se guardaron correctamente.');
    } catch (error) {
      // El formulario conserva lo escrito para poder corregir y reintentar.
      const items = Array.isArray(error.details) ? error.details : error.details?.errors;
      if (Array.isArray(items)) {
        const backendErrors = {};
        for (const item of items) {
          if (EDITABLE_FIELDS.includes(item.field)) backendErrors[item.field] = item.message;
        }
        setErrors((current) => ({ ...current, ...backendErrors }));
      }
      setSaveError(error.details?.message ?? error.message);
    } finally {
      setIsSaving(false);
    }
  }

  const denied = accessProblem(loadError);
  const locked = property ? !isEditable(property) : false;
  const disabled = isSaving || locked;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Editar propiedad"
        description={
          property
            ? `Actualiza la información de «${property.title}».`
            : 'Actualiza la información de tu publicación.'
        }
        actions={
          <Button variant="secondary" to={ROUTES.MY_PROPERTIES}>
            Mis propiedades
          </Button>
        }
      />

      {view === 'loading' && <Loader label="Cargando la propiedad..." className="py-16" />}

      {view === 'error' && (
        <ErrorState
          title={denied?.title ?? 'No pudimos cargar la propiedad'}
          message={denied?.message ?? loadError?.message}
          onRetry={denied ? undefined : retryLoad}
        />
      )}

      {view === 'ready' && (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 lg:col-span-2">
            {locked && (
              <Alert variant="warning" title="Propiedad retirada">
                Esta publicación se retiró de forma definitiva y ya no se puede editar.
              </Alert>
            )}

            {successMessage && (
              <Alert variant="success" onClose={() => setSuccessMessage('')}>
                {successMessage}
              </Alert>
            )}

            {saveError && (
              <Alert variant="error" title="No se pudo guardar" onClose={() => setSaveError('')}>
                {saveError}
              </Alert>
            )}

            <Card title="Datos generales">
              <div className="flex flex-col gap-4">
                <Input
                  id="title"
                  name="title"
                  label="Título de la publicación"
                  value={form.title}
                  onChange={handleChange}
                  error={errors.title}
                  disabled={disabled}
                />

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="propertyTypeId" className="text-ink text-sm font-medium">
                    Tipo de propiedad
                  </label>
                  <select
                    id="propertyTypeId"
                    name="propertyTypeId"
                    value={form.propertyTypeId}
                    onChange={handleChange}
                    disabled={disabled}
                    aria-invalid={Boolean(errors.propertyTypeId)}
                    aria-describedby={errors.propertyTypeId ? 'propertyTypeId-error' : undefined}
                    className={cn(
                      'text-ink h-11 w-full rounded-lg border bg-white px-3 text-base focus:ring-2 focus:outline-none',
                      'disabled:cursor-not-allowed disabled:bg-stone-100',
                      errors.propertyTypeId
                        ? 'border-red-500 focus:ring-red-200'
                        : 'focus:border-primary-500 focus:ring-primary-100 border-stone-300',
                    )}
                  >
                    <option value="">Selecciona una opción</option>
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  {errors.propertyTypeId && (
                    <p id="propertyTypeId-error" role="alert" className="text-sm text-red-600">
                      {errors.propertyTypeId}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="description" className="text-ink text-sm font-medium">
                    Descripción
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={5}
                    maxLength={DESCRIPTION_MAX}
                    value={form.description}
                    onChange={handleChange}
                    disabled={disabled}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={errors.description ? 'description-error' : undefined}
                    className={cn(
                      'text-ink w-full resize-y rounded-lg border bg-white px-3 py-2 text-base focus:ring-2 focus:outline-none',
                      'disabled:cursor-not-allowed disabled:bg-stone-100',
                      errors.description
                        ? 'border-red-500 focus:ring-red-200'
                        : 'focus:border-primary-500 focus:ring-primary-100 border-stone-300',
                    )}
                  />
                  <div className="flex justify-between gap-4">
                    {errors.description ? (
                      <p id="description-error" role="alert" className="text-sm text-red-600">
                        {errors.description}
                      </p>
                    ) : (
                      <span />
                    )}
                    <p className="text-ink-muted text-xs">
                      {form.description.length}/{DESCRIPTION_MAX}
                    </p>
                  </div>
                </div>

                <Input
                  id="publicationPrice"
                  name="publicationPrice"
                  label="Precio de publicación (MXN)"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={form.publicationPrice}
                  onChange={handleChange}
                  error={errors.publicationPrice}
                  hint="Déjalo vacío si aún no defines el precio."
                  disabled={disabled}
                />
              </div>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" to={ROUTES.MY_PROPERTIES}>
                Cancelar
              </Button>
              <Button type="submit" loading={isSaving} disabled={locked || !isDirty}>
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>

          <aside className="flex flex-col gap-4">
            <CurrentData property={property} />
            {!locked && <SectionLinks propertyId={id} />}
          </aside>
        </div>
      )}
    </section>
  );
}

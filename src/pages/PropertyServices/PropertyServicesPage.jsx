import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMyProperty, getPropertyServices, getServiceCatalog, savePropertyServices } from '@/api';
import { Alert, Button, Card, ErrorState, Loader, PageHeader } from '@/components/ui';
import { useUnsavedChanges } from '@/hooks';
import { ROUTES } from '@/utils/constants';
import { cn } from '@/utils/helpers';
import {
  SERVICES_DISCLAIMER,
  isSameSelection,
  selectionFromServices,
  serviceIconName,
  toServiceIds,
  toggleService,
} from '@/utils/propertyServices';
import ServiceIcon from './ServiceIcon';

/** Errores de carga que no se arreglan reintentando: la propiedad no es del usuario o no existe. */
const NOT_OWNER_STATUSES = new Set([403, 404]);

/* ------------------------------------------------------------------ */
/* Casilla de un servicio del catálogo                                 */
/* ------------------------------------------------------------------ */

function ServiceOption({ service, checked, onToggle, disabled }) {
  const inputId = `service-${service.id}`;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors',
        checked
          ? 'border-primary-500 bg-primary-50 text-primary-800'
          : 'text-ink border-stone-300 bg-white hover:bg-stone-50',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(Number(service.id))}
        disabled={disabled}
        className="accent-primary-600 size-4 shrink-0"
      />
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          checked ? 'bg-primary-100 text-primary-700' : 'bg-stone-100 text-stone-500',
        )}
      >
        <ServiceIcon name={serviceIconName(service)} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{service.name}</span>
        {service.description && (
          <span className="text-ink-muted text-xs">{service.description}</span>
        )}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Resumen de lo guardado en la propiedad (CA1, CA2, CA3)              */
/* ------------------------------------------------------------------ */

function ServicesSummary({ services }) {
  return (
    <Card title="Servicios registrados">
      {services.length === 0 ? (
        <p className="text-ink-muted text-sm">Esta propiedad aún no tiene servicios registrados.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-100" aria-label="Servicios registrados">
          {services.map((service) => (
            <li key={service.id} className="text-ink flex items-center gap-3 py-2 text-sm">
              <ServiceIcon name={serviceIconName(service)} className="text-primary-600 size-4" />
              {service.name}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

/**
 * HU-022 · Selección de servicios disponibles en la propiedad.
 * Ruta: /mis-propiedades/:id/servicios (solo el responsable de la publicación).
 */
export default function PropertyServicesPage() {
  const { id } = useParams();

  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [loadError, setLoadError] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [property, setProperty] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [saved, setSaved] = useState([]); // servicios vigentes en el backend
  const [baseline, setBaseline] = useState(() => new Set());
  const [selection, setSelection] = useState(() => new Set());

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isDirty = !isSameSelection(selection, baseline);
  useUnsavedChanges(isDirty && !isSaving);

  // Se cargan propiedad, catálogo y selección actual ANTES de mostrar la sección.
  useEffect(() => {
    let active = true;
    Promise.all([getMyProperty(id), getServiceCatalog(), getPropertyServices(id)])
      .then(([loadedProperty, loadedCatalog, current]) => {
        if (!active) return;
        const currentSelection = selectionFromServices(current);
        setProperty(loadedProperty);
        setCatalog(loadedCatalog);
        setSaved(current);
        setBaseline(currentSelection);
        setSelection(currentSelection);
        setStatus('ready');
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error);
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [id, loadAttempt]);

  function retryLoad() {
    setStatus('loading');
    setLoadError(null);
    setLoadAttempt((attempt) => attempt + 1);
  }

  function handleToggle(serviceId) {
    setSelection((current) => toggleService(current, serviceId));
    setSuccessMessage('');
    setSaveError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving || !isDirty) return;

    setSaveError('');
    setSuccessMessage('');

    try {
      setIsSaving(true);
      const response = await savePropertyServices(id, toServiceIds(selection, catalog));
      const stored = response.services ?? [];
      const storedSelection = selectionFromServices(stored);

      setSaved(stored);
      setBaseline(storedSelection);
      setSelection(storedSelection);
      setSuccessMessage(response.message ?? 'Los servicios se guardaron correctamente.');
    } catch (error) {
      // CA4: la selección se conserva en pantalla para poder reintentar.
      // Solo en un 400 el backend explica qué servicio rechazó; en lo demás, el mensaje del cliente.
      const backendMessage = error.status === 400 ? error.details?.message : null;
      setSaveError(backendMessage ?? error.message);
    } finally {
      setIsSaving(false);
    }
  }

  const isNotOwner = NOT_OWNER_STATUSES.has(loadError?.status);

  return (
    <section className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Servicios de la propiedad"
        description={
          property
            ? `Indica los servicios e infraestructura disponibles en «${property.title}».`
            : 'Indica los servicios e infraestructura disponibles en tu propiedad.'
        }
        actions={
          <Button variant="secondary" to={ROUTES.MY_PROPERTIES}>
            Mis propiedades
          </Button>
        }
      />

      {status === 'loading' && <Loader label="Cargando los servicios..." className="py-16" />}

      {status === 'error' && (
        <ErrorState
          title={
            isNotOwner
              ? 'No puedes editar los servicios de esta propiedad'
              : 'No pudimos cargar los servicios'
          }
          message={
            isNotOwner
              ? 'Solo el responsable de la publicación puede modificar sus servicios.'
              : loadError?.message
          }
          onRetry={isNotOwner ? undefined : retryLoad}
        />
      )}

      {status === 'ready' && (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 lg:col-span-2">
            <Alert variant="info" title="Información declarativa">
              {SERVICES_DISCLAIMER}
            </Alert>

            {successMessage && (
              <Alert variant="success" onClose={() => setSuccessMessage('')}>
                {successMessage}
              </Alert>
            )}

            {saveError && (
              <Alert variant="error" title="No se pudieron guardar los servicios">
                <p>{saveError}</p>
                <p className="mt-1">Tu selección sigue en pantalla; puedes intentarlo de nuevo.</p>
              </Alert>
            )}

            <Card title="Servicios disponibles">
              {catalog.length === 0 ? (
                <p className="text-ink-muted text-sm">
                  El catálogo de servicios no tiene opciones disponibles por ahora.
                </p>
              ) : (
                <fieldset>
                  <legend className="text-ink-muted mb-3 text-sm">
                    Marca los servicios con los que cuenta el inmueble.{' '}
                    <span className="text-ink font-medium">
                      {selection.size === 1 ? '1 seleccionado' : `${selection.size} seleccionados`}
                    </span>
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {catalog.map((service) => (
                      <ServiceOption
                        key={service.id}
                        service={service}
                        checked={selection.has(Number(service.id))}
                        onToggle={handleToggle}
                        disabled={isSaving}
                      />
                    ))}
                  </div>
                </fieldset>
              )}
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" to={ROUTES.MY_PROPERTIES}>
                Cancelar
              </Button>
              <Button type="submit" loading={isSaving} disabled={!isDirty}>
                {saveButtonLabel(isSaving, saveError)}
              </Button>
            </div>
          </form>

          <aside className="flex flex-col gap-4">
            <ServicesSummary services={saved} />
          </aside>
        </div>
      )}
    </section>
  );
}

function saveButtonLabel(isSaving, saveError) {
  if (isSaving) return 'Guardando...';
  return saveError ? 'Reintentar' : 'Guardar servicios';
}

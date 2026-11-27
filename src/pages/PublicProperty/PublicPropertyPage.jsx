import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getPublicProperty } from '@/api';
import { Isotype } from '@/components/brand';
import { Button, ErrorState } from '@/components/ui';
import { useOnlineStatus } from '@/hooks';
import { ROUTES } from '@/utils/constants';
import { formatDate, formatPrice } from '@/utils/helpers';
import {
  getOfflineProperty,
  isNetworkError,
  removeOfflineProperty,
  saveOfflineProperty,
} from '@/utils/offlineProperties';
import { galleryPhotos, isUnavailableError } from '@/utils/propertyDetail';
import { getPublicPropertyType, summarizePropertyLocation } from '@/utils/publicProperties';
import PropertyActions from './PropertyActions';
import PropertyGallery from './PropertyGallery';
import {
  DetailSection,
  FeaturesSection,
  LocationSection,
  ServicesSection,
} from './PropertySections';

/** Precio del vendedor y, aparte y rotulada como orientativa, la estimación de IA. */
function PriceCard({ property, notes }) {
  const { publicationPrice, estimate } = property;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-ink-muted text-sm">Precio de venta</p>
        <p className="font-display text-ink mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          {publicationPrice === null || publicationPrice === undefined
            ? 'Precio a consultar'
            : `${formatPrice(publicationPrice)} MXN`}
        </p>
        <p className="text-ink-muted mt-1 text-xs">
          {notes.publicationPrice ?? 'Precio vigente definido por el vendedor.'}
        </p>
      </div>

      {estimate && (
        <aside
          aria-label="Estimación orientativa con IA"
          className="border-sage-300 bg-sage-50 rounded-2xl border border-dashed p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sage-900 text-sm font-semibold">Estimación con IA</p>
            <span className="bg-sage-200 text-sage-900 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              Orientativa
            </span>
          </div>
          <p className="text-sage-900 font-display mt-2 text-lg font-semibold">
            {formatPrice(estimate.estimatedMin)} – {formatPrice(estimate.estimatedMax)}
          </p>
          <p className="text-sage-900/80 mt-2 text-xs leading-relaxed">
            {notes.estimate ??
              'Estimación orientativa generada con IA. No es el precio de venta ni un avalúo oficial.'}
            {estimate.generatedAt && ` Calculada el ${formatDate(estimate.generatedAt)}.`}
          </p>
        </aside>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Cargando la propiedad" className="animate-pulse">
      <div className="bg-surface-muted mb-6 h-8 w-2/3 rounded-xl" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="bg-surface-muted aspect-[16/9] rounded-3xl" />
        <div className="bg-surface-muted h-72 rounded-3xl" />
      </div>
    </div>
  );
}

/** CA4: la publicación no existe o ya no está disponible. */
/** Regresa al catálogo con la búsqueda desde la que se abrió la ficha, si la hay. */
function useCatalogHref() {
  const { state } = useLocation();
  const search = state?.catalogSearch;
  return typeof search === 'string' && search.startsWith('?')
    ? `${ROUTES.CATALOG}${search}`
    : ROUTES.CATALOG;
}

function UnavailableNotice({ gone }) {
  const catalogHref = useCatalogHref();
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-stone-200 bg-white px-6 py-14 text-center shadow-sm">
      <Isotype className="mb-5 h-14" />
      <h1 className="text-ink text-2xl sm:text-3xl">Esta publicación no está disponible</h1>
      <p className="text-ink-muted mt-3">
        {gone
          ? 'El vendedor la desactivó o la retiró, así que ya no se muestra a compradores.'
          : 'No encontramos la propiedad que buscas. Es posible que el enlace sea incorrecto o antiguo.'}
      </p>
      <Button to={catalogHref} size="lg" className="mt-8">
        Volver al catálogo
      </Button>
    </section>
  );
}

const savedAtFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * Pide la ficha a la red y guarda una copia local. Sin conexión usa esa copia, si existe.
 * @returns {Promise<{ property: object, notes: object, source: 'network'|'offline', savedAt?: number }>}
 */
async function loadProperty(id) {
  try {
    const data = await getPublicProperty(id);
    saveOfflineProperty(data.property, data.notes);
    return { ...data, source: 'network' };
  } catch (error) {
    if (isUnavailableError(error)) removeOfflineProperty(id);
    if (!isNetworkError(error)) throw error;
    const saved = getOfflineProperty(id);
    if (!saved) throw Object.assign(error, { offlineMiss: true });
    return {
      property: saved.property,
      notes: saved.notes ?? {},
      source: 'offline',
      savedAt: saved.savedAt,
    };
  }
}

/** Aviso de que la ficha viene de la copia guardada y puede no estar actualizada. */
function OfflineCopyNotice({ savedAt, online, onRefresh }) {
  return (
    <div
      role="status"
      className="border-earth-300 bg-earth-50 text-earth-900 flex flex-col gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="font-display font-semibold">Estás viendo una copia guardada sin conexión</p>
        <p className="text-sm">
          Guardada el {savedAtFormatter.format(savedAt)} · Precio, disponibilidad y demás datos
          pueden no estar actualizados.
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onRefresh} disabled={!online}>
        {online ? 'Actualizar ahora' : 'Sin conexión'}
      </Button>
    </div>
  );
}

/** La propiedad nunca se abrió en este dispositivo y no hay conexión para pedirla. */
function OfflineMissNotice({ onRetry }) {
  const catalogHref = useCatalogHref();
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-stone-200 bg-white px-6 py-14 text-center shadow-sm">
      <Isotype className="h-14 w-auto opacity-70" />
      <h1 className="text-ink mt-6 text-2xl sm:text-3xl">Esta propiedad requiere conexión</h1>
      <p className="text-ink-muted mt-3">
        No la has abierto antes en este dispositivo, así que no hay una copia guardada. Conéctate a
        Internet para consultarla.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={onRetry} size="lg">
          Reintentar
        </Button>
        <Button to={catalogHref} variant="secondary" size="lg">
          Volver al catálogo
        </Button>
      </div>
    </section>
  );
}

/**
 * Ficha pública de una propiedad: galería, precio, características, servicios, ubicación
 * con mapa y entorno. Se puede abrir con un enlace directo y sin iniciar sesión.
 */
export default function PublicPropertyPage() {
  const { id } = useParams();
  const catalogHref = useCatalogHref();
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const online = useOnlineStatus();
  const showingOfflineCopy = state.data?.source === 'offline';

  useEffect(() => {
    let active = true;
    loadProperty(id)
      .then((data) => active && setState({ status: 'ready', data, error: null }))
      .catch((error) => active && setState({ status: 'error', data: null, error }));
    return () => {
      active = false;
    };
  }, [id, attempt]);

  // Al recuperar la conexión, una copia guardada se reemplaza por la versión vigente.
  useEffect(() => {
    if (!showingOfflineCopy) return undefined;
    const refresh = () => setAttempt((value) => value + 1);
    window.addEventListener('online', refresh);
    return () => window.removeEventListener('online', refresh);
  }, [showingOfflineCopy]);

  const retry = () => {
    setState({ status: 'loading', data: null, error: null });
    setAttempt((value) => value + 1);
  };

  if (state.status === 'loading') return <DetailSkeleton />;

  if (state.status === 'error') {
    if (isUnavailableError(state.error))
      return <UnavailableNotice gone={state.error.status === 410} />;
    if (state.error.offlineMiss) return <OfflineMissNotice onRetry={retry} />;
    return (
      <ErrorState
        title="No pudimos cargar la propiedad"
        message={state.error.message}
        onRetry={retry}
      />
    );
  }

  const { property, notes } = state.data;
  const photos = galleryPhotos(property.photos);

  return (
    <article className="flex flex-col gap-8">
      {showingOfflineCopy && (
        <OfflineCopyNotice
          savedAt={state.data.savedAt}
          online={online}
          onRefresh={() => setAttempt((value) => value + 1)}
        />
      )}
      <header className="flex flex-col gap-3">
        <Link
          to={catalogHref}
          className="text-primary-700 w-fit text-sm font-semibold hover:underline"
        >
          ← Volver al catálogo
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-earth-50 text-earth-800 rounded-full px-3 py-1 text-xs font-semibold">
            {getPublicPropertyType(property.propertyType)}
          </span>
          <span className="text-ink-muted text-sm">
            {summarizePropertyLocation(property.location)}
          </span>
        </div>
        <h1 className="text-ink text-3xl leading-tight sm:text-4xl">{property.title}</h1>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <PropertyGallery photos={photos} title={property.title} />

          {property.description && (
            <DetailSection id="ficha-descripcion" eyebrow="La propiedad" title="Descripción">
              <p className="text-ink leading-relaxed whitespace-pre-line">{property.description}</p>
            </DetailSection>
          )}

          <FeaturesSection property={property} />
          <ServicesSection services={property.services} />
          <LocationSection property={property} distanceNote={notes.nearbyPlaces} showMap={online} />
        </div>

        <aside className="flex flex-col gap-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <PriceCard property={property} notes={notes} />
          <PropertyActions property={property} online={online} />
          {property.publishedAt && (
            <p className="text-ink-muted border-t border-stone-100 pt-4 text-xs">
              Publicada el {formatDate(property.publishedAt)}
            </p>
          )}
        </aside>
      </div>
    </article>
  );
}

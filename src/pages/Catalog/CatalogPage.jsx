import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPublicProperties, getPublicServiceCatalog } from '@/api';
import { PropertyCardSkeleton, PublicPropertyCard } from '@/components/property';
import { Button, EmptyState, ErrorState, PageHeader } from '@/components/ui';
import { useOnlineStatus } from '@/hooks';
import {
  describeActiveFilters,
  removeFilter,
  toSearchParams,
  validateCatalogFilters,
  valuesFromSearchParams,
} from '@/utils/catalogFilters';
import { appendUniqueProperties, PUBLIC_PROPERTIES_PAGE_SIZE } from '@/utils/publicProperties';
import ActiveFilters from './ActiveFilters';
import CatalogFilters from './CatalogFilters';
import OfflineSavedList from './OfflineSavedList';

const GRID_CLASSES = 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3';

/**
 * Catálogo público con búsqueda y filtros.
 * Los criterios viven en la URL (/catalogo?q=casa&maxPrice=900000): se puede volver a la búsqueda,
 * compartirla y recargarla. Cada cambio de criterios reinicia la paginación.
 */
export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.toString();
  const online = useOnlineStatus();

  // Criterios de la URL ya validados. Con errores (URL editada a mano) no se envía la consulta.
  const criteria = useMemo(() => {
    const values = valuesFromSearchParams(new URLSearchParams(searchString));
    const { filters, errors } = validateCatalogFilters(values);
    const invalid = Object.keys(errors).length > 0;
    return {
      values,
      filters,
      errors,
      invalid,
      key: invalid ? `invalid:${searchString}` : toSearchParams(filters).toString(),
    };
  }, [searchString]);

  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [status, setStatus] = useState(criteria.invalid ? 'invalid' : 'loading');
  const [loadError, setLoadError] = useState('');
  const [services, setServices] = useState({ status: 'loading', items: [] });

  // Al cambiar los criterios se vuelve a la primera página y se descarta la lista anterior.
  const [appliedKey, setAppliedKey] = useState(criteria.key);
  if (appliedKey !== criteria.key) {
    setAppliedKey(criteria.key);
    setPage(1);
    setProperties([]);
    setPagination(null);
    setLoadError('');
    setStatus(criteria.invalid ? 'invalid' : 'loading');
  }

  useEffect(() => {
    let active = true;
    getPublicServiceCatalog()
      .then((items) => active && setServices({ status: 'ready', items }))
      .catch(() => active && setServices({ status: 'error', items: [] }));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (criteria.invalid) return undefined;
    let active = true;
    getPublicProperties({ page, limit: PUBLIC_PROPERTIES_PAGE_SIZE, ...criteria.filters })
      .then((result) => {
        if (!active) return;
        setProperties((current) =>
          appendUniqueProperties(page === 1 ? [] : current, result.properties),
        );
        setPagination(result.pagination);
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setLoadError(
          'No pudimos consultar las propiedades. Revisa tu conexión e inténtalo de nuevo.',
        );
        setStatus(page === 1 ? 'error' : 'moreError');
      });

    return () => {
      active = false;
    };
  }, [page, loadAttempt, criteria]);

  function loadMore() {
    if (status !== 'ready' || !pagination?.hasNextPage) return;
    setStatus('loadingMore');
    setLoadError('');
    setPage(pagination.page + 1);
  }

  function retry() {
    setStatus(page === 1 ? 'loading' : 'loadingMore');
    setLoadError('');
    setLoadAttempt((attempt) => attempt + 1);
  }
  // Si la carga falló por falta de conexión, se reintenta sola al recuperarla.
  useEffect(() => {
    if (status !== 'error' && status !== 'moreError') return undefined;
    const reload = () => retry();
    window.addEventListener('online', reload);
    return () => window.removeEventListener('online', reload);
  });

  function applyFilters(filters) {
    setSearchParams(toSearchParams(filters));
  }

  const chips = criteria.invalid ? [] : describeActiveFilters(criteria.filters, services.items);
  const hasFilters = chips.length > 0;
  const hasProperties = properties.length > 0;

  return (
    <section>
      <PageHeader
        title="Propiedades disponibles"
        description="Encuentra un lugar para tu próximo proyecto. Explora terrenos y viviendas en TerraValle."
      />

      <CatalogFilters
        key={criteria.key}
        initialValues={criteria.values}
        initialErrors={criteria.errors}
        services={services}
        onApply={applyFilters}
      />

      <ActiveFilters
        chips={chips}
        onRemove={(chip) => applyFilters(removeFilter(criteria.filters, chip))}
        onClear={() => applyFilters({})}
      />

      <p role="status" className="sr-only">
        {status === 'loading' && 'Cargando propiedades...'}
        {status === 'loadingMore' && 'Cargando más propiedades...'}
        {status === 'ready' && `${properties.length} propiedades cargadas.`}
        {status === 'invalid' && 'Corrige los criterios de búsqueda marcados.'}
      </p>

      {status === 'loading' && (
        <div aria-hidden="true" className={GRID_CLASSES}>
          {Array.from({ length: 6 }, (_, index) => (
            <PropertyCardSkeleton key={index} />
          ))}
        </div>
      )}

      {status === 'error' && (
        <ErrorState
          title={online ? 'No pudimos cargar el catálogo' : 'El catálogo requiere conexión'}
          message={
            online
              ? loadError
              : 'Conéctate a Internet para ver las propiedades publicadas. Mientras tanto puedes abrir las fichas que ya consultaste.'
          }
          onRetry={retry}
        />
      )}

      {status === 'error' && !online && <OfflineSavedList />}

      {status === 'ready' && !hasProperties && hasFilters && (
        <EmptyState
          title="No se encontraron propiedades con estos filtros."
          description="Prueba quitando o ajustando algunos criterios para ver más opciones."
          action={
            <Button variant="secondary" onClick={() => applyFilters({})}>
              Limpiar filtros
            </Button>
          }
        />
      )}

      {status === 'ready' && !hasProperties && !hasFilters && (
        <EmptyState
          title="No hay propiedades disponibles en este momento."
          description="Vuelve pronto para descubrir nuevas oportunidades."
        />
      )}

      {hasProperties && (
        <>
          <p className="text-ink-muted mb-4 text-sm">
            Mostrando {properties.length}
            {pagination?.total != null && ` de ${pagination.total}`} propiedades
          </p>
          <ul id="catalog-properties" aria-label="Propiedades disponibles" className={GRID_CLASSES}>
            {properties.map((property) => (
              <li key={property.id}>
                <PublicPropertyCard property={property} />
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col items-center gap-4">
            {status === 'moreError' ? (
              <ErrorState
                title="No pudimos cargar más propiedades"
                message={loadError}
                onRetry={retry}
                className="w-full"
              />
            ) : pagination?.hasNextPage ? (
              <Button
                onClick={loadMore}
                loading={status === 'loadingMore'}
                aria-controls="catalog-properties"
              >
                {status === 'loadingMore'
                  ? 'Cargando más propiedades...'
                  : 'Cargar más propiedades'}
              </Button>
            ) : (
              <p className="text-ink-muted text-center text-sm">
                {hasFilters
                  ? 'Has visto todas las propiedades que cumplen tus filtros.'
                  : 'Has visto todas las propiedades disponibles.'}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

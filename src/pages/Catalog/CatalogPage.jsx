import { useEffect, useState } from 'react';
import { getPublicProperties } from '@/api';
import { PropertyCardSkeleton, PublicPropertyCard } from '@/components/property';
import { Button, EmptyState, ErrorState, PageHeader } from '@/components/ui';
import { appendUniqueProperties, PUBLIC_PROPERTIES_PAGE_SIZE } from '@/utils/publicProperties';

const GRID_CLASSES = 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3';

export default function CatalogPage() {
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    getPublicProperties({ page, limit: PUBLIC_PROPERTIES_PAGE_SIZE })
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
  }, [page, loadAttempt]);

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

  const hasProperties = properties.length > 0;

  return (
    <section>
      <PageHeader
        title="Propiedades disponibles"
        description="Encuentra un lugar para tu próximo proyecto. Explora terrenos y viviendas en TerraValle."
      />

      <p role="status" className="sr-only">
        {status === 'loading' && 'Cargando propiedades...'}
        {status === 'loadingMore' && 'Cargando más propiedades...'}
        {status === 'ready' && `${properties.length} propiedades cargadas.`}
      </p>

      {status === 'loading' && (
        <div aria-hidden="true" className={GRID_CLASSES}>
          {Array.from({ length: 6 }, (_, index) => (
            <PropertyCardSkeleton key={index} />
          ))}
        </div>
      )}

      {status === 'error' && (
        <ErrorState title="No pudimos cargar el catálogo" message={loadError} onRetry={retry} />
      )}

      {status === 'ready' && !hasProperties && (
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
                Has visto todas las propiedades disponibles.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

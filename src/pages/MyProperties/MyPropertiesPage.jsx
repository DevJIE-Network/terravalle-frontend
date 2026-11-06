import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { changePropertyStatus, listMyProperties, withdrawProperty } from '@/api';
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Loader,
  PageHeader,
} from '@/components/ui';
import { ROUTES } from '@/utils/constants';
import {
  ACTION_CONFIG,
  PAGE_SIZE,
  STATUS_FILTERS,
  applyStatusChange,
  describeAction,
  getPendingItems,
} from '@/utils/myProperties';
import PropertyCard from './PropertyCard';

/**
 * HU-024 · Panel para administrar mis propiedades publicadas.
 * Lista SOLO las propiedades del usuario autenticado (el dueño lo decide el backend por el token)
 * y permite editar, activar/desactivar y retirar, con confirmación previa en lo que cambia la visibilidad.
 */
export default function MyPropertiesPage() {
  const location = useLocation();

  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [view, setView] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [pendingAction, setPendingAction] = useState(null); // { action, property }
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState(location.state?.message ?? '');

  useEffect(() => {
    let active = true;
    listMyProperties({ status: statusFilter || undefined, page, limit: PAGE_SIZE })
      .then((result) => {
        if (!active) return;
        setProperties(result.properties);
        setPagination(result.pagination);
        setView('ready');
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error.message);
        setView('error');
      });
    return () => {
      active = false;
    };
  }, [statusFilter, page, loadAttempt]);

  function reload() {
    setView('loading');
    setLoadError('');
    setLoadAttempt((attempt) => attempt + 1);
  }

  function applyFilter(value) {
    setStatusFilter(value);
    setPage(1);
    setNotice('');
    setView('loading');
  }

  function goToPage(next) {
    setPage(next);
    setView('loading');
  }

  function askConfirmation(action, property) {
    setActionError('');
    setPendingAction({ action, property });
  }

  function closeDialog() {
    if (isWorking) return;
    setPendingAction(null);
    setActionError('');
  }

  async function handleConfirm() {
    if (!pendingAction || isWorking) return;
    const { action, property } = pendingAction;
    const { targetStatus } = ACTION_CONFIG[action];

    try {
      setIsWorking(true);
      setActionError('');
      const updated =
        action === 'withdraw'
          ? await withdrawProperty(property.id)
          : await changePropertyStatus(property.id, targetStatus);

      // El estado nuevo manda aunque el backend devuelva menos campos que la lista.
      const merged = { ...property, ...updated, status: targetStatus };
      setProperties((current) => applyStatusChange(current, merged, statusFilter));
      setNotice(describeAction(action, property).success);
      setPendingAction(null);
    } catch (error) {
      // El diálogo sigue abierto: un 409 (estado ya cambiado) explica qué pasó.
      setActionError(error.details?.message ?? error.message);
    } finally {
      setIsWorking(false);
    }
  }

  const description = pendingAction
    ? describeAction(
        pendingAction.action,
        pendingAction.property,
        getPendingItems(pendingAction.property),
      )
    : null;

  const totalPages = pagination?.totalPages ?? 1;
  const hasFilter = statusFilter !== '';
  const isEmpty = view === 'ready' && properties.length === 0;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Mis propiedades"
        description="Administra tus publicaciones: edítalas, controla cuáles están disponibles para los compradores o retíralas."
        actions={<Button to={ROUTES.CREATE_PROPERTY}>Publicar propiedad</Button>}
      />

      {notice && (
        <div className="mb-4">
          <Alert variant="success" onClose={() => setNotice('')}>
            {notice}
          </Alert>
        </div>
      )}

      {view === 'loading' && <Loader label="Cargando tus propiedades..." className="py-16" />}

      {view === 'error' && (
        <ErrorState
          title="No pudimos cargar tus propiedades"
          message={loadError}
          onRetry={reload}
        />
      )}

      {view === 'ready' && (
        <>
          {(properties.length > 0 || hasFilter) && (
            <div className="mb-4 flex items-center gap-3">
              <label htmlFor="status-filter" className="text-ink text-sm font-medium">
                Mostrar
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => applyFilter(event.target.value)}
                className="text-ink focus:border-primary-500 focus:ring-primary-100 h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm focus:ring-2 focus:outline-none"
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isEmpty && !hasFilter && (
            <EmptyState
              title="Aún no has publicado propiedades"
              description="Registra tu primer inmueble para administrarlo desde aquí: verás su estado y podrás editarlo, activarlo o retirarlo."
              action={<Button to={ROUTES.CREATE_PROPERTY}>Registrar mi primera propiedad</Button>}
            />
          )}

          {isEmpty && hasFilter && (
            <EmptyState
              title="No hay propiedades con ese estado"
              description="Prueba con otro filtro para ver el resto de tus publicaciones."
              action={
                <Button variant="secondary" onClick={() => applyFilter('')}>
                  Ver todas
                </Button>
              }
            />
          )}

          {properties.length > 0 && (
            <ul className="flex flex-col gap-4">
              {properties.map((property) => (
                <li key={property.id}>
                  <PropertyCard property={property} onAction={askConfirmation} />
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <nav
              aria-label="Paginación"
              className="mt-6 flex items-center justify-between gap-3 text-sm"
            >
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Anterior
              </Button>
              <span className="text-ink-muted">
                Página {page} de {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Siguiente
              </Button>
            </nav>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={description?.title ?? ''}
        confirmLabel={description?.confirmLabel}
        variant={description?.variant}
        loading={isWorking}
        error={actionError}
        onConfirm={handleConfirm}
        onCancel={closeDialog}
      >
        {description?.body}
      </ConfirmDialog>
    </section>
  );
}

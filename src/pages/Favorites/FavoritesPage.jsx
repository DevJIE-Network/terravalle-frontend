import { useEffect, useMemo, useState } from 'react';
import { PropertyCardSkeleton } from '@/components/property';
import { Alert, Button, EmptyState, ErrorState, PageHeader } from '@/components/ui';
import { useFavorites } from '@/hooks';
import { ROUTES } from '@/utils/constants';
import { normalizeFavorite } from '@/utils/favorites';
import FavoriteCard from './FavoriteCard';
import UndoNotice from './UndoNotice';

const GRID_CLASSES = 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3';

/**
 * Mis favoritos (HU-030): las propiedades que el usuario guardó, con su disponibilidad.
 * Quitar una no toca la publicación; la acción se puede deshacer mientras el aviso siga visible.
 */
export default function FavoritesPage() {
  const { items, busy, errors, loaded, loading, loadError, refresh, remove, restore } =
    useFavorites();
  const [undoable, setUndoable] = useState([]);

  // Siempre se vuelve a consultar al entrar, para que la disponibilidad esté al día.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const favorites = useMemo(() => items.map(normalizeFavorite), [items]);
  const unavailableCount = favorites.filter((item) => !item.availability.available).length;

  async function removeFavorite(favorite) {
    const result = await remove(favorite.propertyId);
    if (!result.ok || result.skipped) return;
    setUndoable((current) => [
      ...current,
      { key: `${favorite.propertyId}-${Date.now()}`, title: favorite.title, ...result },
    ]);
  }

  async function undo(item) {
    const result = await restore(item.entry, item.index);
    if (result.ok) setUndoable((current) => current.filter((other) => other.key !== item.key));
    return result.ok;
  }

  const dismiss = (key) => setUndoable((current) => current.filter((item) => item.key !== key));

  const showSkeleton = favorites.length === 0 && loading;
  const showError = !loaded && !loading && loadError && favorites.length === 0;
  const showEmpty = loaded && favorites.length === 0 && !loading;

  return (
    <section>
      <PageHeader
        title="Mis favoritos"
        description="Las propiedades que guardaste para revisarlas después."
      />

      <p role="status" className="sr-only">
        {loaded && `${favorites.length} propiedades guardadas.`}
      </p>

      {undoable.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          {undoable.map((item) => (
            <UndoNotice
              key={item.key}
              title={item.title}
              onUndo={() => undo(item)}
              onDismiss={() => dismiss(item.key)}
            />
          ))}
        </div>
      )}

      {loaded && loadError && (
        <Alert variant="warning" className="mb-6">
          No pudimos actualizar tu lista. Mostramos lo último que cargó.
        </Alert>
      )}

      {unavailableCount > 0 && (
        <Alert variant="info" className="mb-6">
          {unavailableCount === 1
            ? '1 de tus favoritos ya no está disponible.'
            : `${unavailableCount} de tus favoritos ya no están disponibles.`}{' '}
          Puedes conservarlos en la lista o quitarlos.
        </Alert>
      )}

      {showSkeleton && (
        <div aria-hidden="true" className={GRID_CLASSES}>
          {Array.from({ length: 3 }, (_, index) => (
            <PropertyCardSkeleton key={index} />
          ))}
        </div>
      )}

      {showError && (
        <ErrorState title="No pudimos cargar tus favoritos" message={loadError} onRetry={refresh} />
      )}

      {showEmpty && (
        <EmptyState
          title="Aún no tienes favoritos"
          description="Cuando marques propiedades como favoritas en el catálogo, aparecerán aquí."
          action={
            <Button to={ROUTES.CATALOG} variant="secondary">
              Explorar el catálogo
            </Button>
          }
        />
      )}

      {favorites.length > 0 && (
        <ul aria-label="Propiedades favoritas" className={GRID_CLASSES}>
          {favorites.map((favorite) => (
            <li key={favorite.propertyId}>
              <FavoriteCard
                favorite={favorite}
                removing={busy[favorite.propertyId] === 'removing'}
                error={errors[favorite.propertyId]}
                onRemove={() => removeFavorite(favorite)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

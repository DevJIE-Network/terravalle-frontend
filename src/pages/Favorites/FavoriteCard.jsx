import { Link } from 'react-router-dom';
import { PropertyPhoto } from '@/components/property/PublicPropertyCard';
import { Button, Card } from '@/components/ui';
import { buildPublicPropertyPath } from '@/utils/constants';

/**
 * Tarjeta de "Mis favoritos". Una propiedad que dejó de estar publicada se conserva, marcada como
 * "No disponible" y sin enlace a la ficha; el usuario puede quitarla igual que las demás.
 *
 * @param {object} props
 * @param {ReturnType<import('@/utils/favorites').normalizeFavorite>} props.favorite
 * @param {boolean} props.removing Hay una petición para quitarla en curso.
 * @param {string} [props.error] Mensaje si no se pudo quitar.
 * @param {() => void} props.onRemove
 */
export default function FavoriteCard({ favorite, removing, error, onRemove }) {
  const { propertyId, title, propertyType, location, price, photoUrl, availability } = favorite;
  const headingId = `favorite-${propertyId}-title`;

  return (
    <article aria-labelledby={headingId} className="h-full">
      <Card className="h-full overflow-hidden">
        <div className="flex h-full flex-col">
          <PropertyPhoto primaryPhoto={photoUrl} title={title} dimmed={!availability.available} />

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="bg-earth-50 text-earth-800 rounded-full px-3 py-1 text-xs font-semibold">
              {propertyType}
            </p>
            {!availability.available && (
              <p className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-800">
                No disponible
              </p>
            )}
          </div>

          <h2 id={headingId} className="font-display text-ink text-lg font-semibold break-words">
            {title}
          </h2>
          <p className="text-ink-muted mt-1 text-sm break-words">{location}</p>
          <p className="font-display text-primary-800 mt-4 text-xl font-bold">{price}</p>
          {!availability.available && (
            <p className="text-ink-muted mt-2 text-sm">{availability.note}</p>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-stone-100 pt-4">
            {availability.available ? (
              <Link
                to={buildPublicPropertyPath(propertyId)}
                aria-label={`Ver propiedad: ${title}`}
                className="text-primary-700 focus-visible:ring-primary-500/40 rounded-lg text-sm font-semibold hover:underline focus-visible:ring-4 focus-visible:outline-none"
              >
                Ver propiedad <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span className="text-ink-muted text-sm">Sin ficha pública</span>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={onRemove}
              loading={removing}
              aria-label={`Quitar de favoritos: ${title}`}
            >
              Quitar
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      </Card>
    </article>
  );
}

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import {
  buildPropertyDimensionsPath,
  buildPropertyEditPath,
  buildPropertyEstimationPath,
  buildPropertyServicesPath,
} from '@/utils/constants';
import { cn, formatPrice } from '@/utils/helpers';
import {
  ACTION_CONFIG,
  getAvailableActions,
  getPendingItems,
  getPrimaryPhotoUrl,
  getStatusConfig,
  isEditable,
} from '@/utils/myProperties';
import StatusBadge from './StatusBadge';

const LINK_CLASS =
  'text-primary-700 hover:text-primary-900 rounded text-sm font-medium underline-offset-2 hover:underline';

function Photo({ url, title }) {
  if (!url) {
    return (
      <div className="bg-surface-muted text-ink-muted flex h-full min-h-36 w-full items-center justify-center text-sm">
        Sin fotografía
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={`Fotografía principal de ${title}`}
      loading="lazy"
      className="h-full min-h-36 w-full object-cover"
    />
  );
}

/**
 * Tarjeta de una propiedad del panel: foto, título, estado, pendientes y acciones.
 * No decide nada de negocio: las acciones disponibles salen de `getAvailableActions`
 * y el cambio real lo hace la página tras la confirmación.
 *
 * @param {object} props
 * @param {object} props.property
 * @param {(action: 'activate'|'deactivate'|'withdraw', property: object) => void} props.onAction
 */
export default function PropertyCard({ property, onAction }) {
  const status = getStatusConfig(property.status);
  const actions = getAvailableActions(property.status);
  const pending = getPendingItems(property);
  const headingId = `property-${property.id}-title`;
  const withdrawn = !isEditable(property);

  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm sm:flex-row',
        withdrawn && 'opacity-80',
      )}
    >
      <div className="bg-surface-muted sm:w-56 sm:shrink-0">
        <Photo url={getPrimaryPhotoUrl(property)} title={property.title} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id={headingId} className="text-ink truncate text-base font-semibold">
              {property.title}
            </h2>
            <p className="text-ink-muted text-sm">
              {typeof property.publicationPrice === 'number'
                ? formatPrice(property.publicationPrice)
                : 'Precio sin definir'}
            </p>
          </div>
          <StatusBadge status={property.status} />
        </div>

        <p className="text-ink-muted text-sm">{status.visibility}</p>

        {pending.length > 0 && (
          <div
            role="group"
            aria-label="Información pendiente"
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            <p className="font-semibold">Información pendiente</p>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {pending.map((item) => (
                <li key={item.key}>
                  <Link to={item.to} className="font-medium underline underline-offset-2">
                    Completar: {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {withdrawn ? (
          <p className="text-ink-muted text-sm">
            Esta propiedad fue retirada y ya no se puede editar ni reactivar.
          </p>
        ) : (
          <>
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="secondary" to={buildPropertyEditPath(property.id)}>
                Editar
              </Button>
              {actions.map((action) => (
                <Button
                  key={action}
                  size="sm"
                  variant={action === 'withdraw' ? 'danger' : 'secondary'}
                  onClick={() => onAction(action, property)}
                  aria-label={`${ACTION_CONFIG[action].label} ${property.title}`}
                >
                  {ACTION_CONFIG[action].label}
                </Button>
              ))}
            </div>

            <nav aria-label={`Secciones de ${property.title}`} className="flex flex-wrap gap-x-4">
              <Link to={buildPropertyDimensionsPath(property.id)} className={LINK_CLASS}>
                Dimensiones
              </Link>
              <Link to={buildPropertyServicesPath(property.id)} className={LINK_CLASS}>
                Servicios
              </Link>
              <Link to={buildPropertyEstimationPath(property.id)} className={LINK_CLASS}>
                Estimación
              </Link>
            </nav>
          </>
        )}
      </div>
    </article>
  );
}

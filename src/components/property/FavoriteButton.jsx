import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Alert, Button } from '@/components/ui';
import { useOnlineStatus } from '@/hooks';
import { useOptionalFavorites } from '@/hooks/useFavorites';
import { ROUTES } from '@/utils/constants';
import { cn } from '@/utils/helpers';
import HeartIcon from './HeartIcon';

const ICON_BUTTON =
  'flex size-11 items-center justify-center rounded-full bg-white/95 shadow-md ring-1 ring-stone-200 ' +
  'transition-colors hover:bg-white focus-visible:ring-4 focus-visible:ring-primary-500/40 focus-visible:outline-none ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Ícono de favorito (HU-030). Se usa en las tarjetas del catálogo (`variant="icon"`) y en la ficha
 * (`variant="full"`, con texto). Los dos comparten el mismo estado, así que se ven igual en todas
 * las pantallas.
 *
 * - Sin sesión es un enlace a iniciar sesión (y de ahí se regresa a esta misma página).
 * - Con sesión guarda o quita al instante; si el backend falla, regresa al estado anterior y avisa.
 * - Sin <FavoritesProvider> no se muestra (el catálogo funciona sin él).
 *
 * @param {object} props
 * @param {string|number} props.propertyId
 * @param {string} props.title Nombre de la propiedad, para el nombre accesible.
 * @param {'icon'|'full'} [props.variant='icon']
 * @param {object} [props.snapshot] Datos de la propiedad para mostrarla en "Mis favoritos" al instante.
 * @param {string} [props.className]
 */
export default function FavoriteButton({
  propertyId,
  title,
  variant = 'icon',
  snapshot,
  className,
}) {
  const favorites = useOptionalFavorites();
  const location = useLocation();
  const online = useOnlineStatus();
  const ensureLoaded = favorites?.ensureLoaded;
  const isAuthenticated = favorites?.isAuthenticated;

  // Con sesión, la primera tarjeta o ficha que se muestra pide la lista; las demás la reutilizan.
  useEffect(() => {
    if (isAuthenticated) ensureLoaded();
  }, [isAuthenticated, ensureLoaded]);

  if (!favorites) return null;

  const loginState = { from: { pathname: location.pathname, search: location.search } };

  if (!favorites.isAuthenticated) {
    if (variant === 'full') {
      return (
        <Button variant="secondary" size="lg" fullWidth to={ROUTES.LOGIN} state={loginState}>
          <HeartIcon /> Inicia sesión para guardar
        </Button>
      );
    }
    return (
      <div className={className}>
        <Link
          to={ROUTES.LOGIN}
          state={loginState}
          aria-label={`Inicia sesión para guardar en favoritos: ${title}`}
          className={cn(ICON_BUTTON, 'text-primary-800')}
        >
          <HeartIcon />
        </Link>
      </div>
    );
  }

  const id = String(propertyId);
  const saved = favorites.isFavorite(propertyId);
  const busy = Boolean(favorites.busy[id]);
  const error = favorites.errors[id];
  // Mientras se consulta la lista por primera vez aún no se sabe si ya estaba guardada.
  const unknown = !favorites.loaded && favorites.loading;
  const disabled = unknown || !online;

  const toggle = () => favorites.toggle(propertyId, snapshot);

  if (variant === 'full') {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <Button
          variant={saved ? 'accent' : 'secondary'}
          size="lg"
          fullWidth
          onClick={toggle}
          disabled={disabled}
          aria-pressed={saved}
          aria-busy={busy || undefined}
        >
          <HeartIcon filled={saved} />
          {saved ? 'Guardada en favoritos' : 'Guardar en favoritos'}
        </Button>
        {error && (
          <Alert variant="error" onClose={() => favorites.clearError(propertyId)}>
            {error}
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-pressed={saved}
        aria-busy={busy || undefined}
        aria-label={`Guardar en favoritos: ${title}`}
        title={saved ? 'Quitar de favoritos' : 'Guardar en favoritos'}
        className={cn(ICON_BUTTON, saved ? 'text-earth-600' : 'text-primary-800')}
      >
        <HeartIcon filled={saved} />
      </button>
      {error && (
        <p
          role="alert"
          className="absolute top-full right-0 z-20 mt-2 w-56 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 shadow-md"
        >
          {error}
        </p>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { favoriteService, getPropertyContact } from '@/api';
import { Alert, Button } from '@/components/ui';
import { useAuth } from '@/hooks';
import { ROUTES } from '@/utils/constants';
import { contactLink } from '@/utils/propertyDetail';

/** Muestra el medio de contacto que el vendedor autorizó, solo cuando el usuario lo pide. */
function ContactSeller({ propertyId, title }) {
  const [state, setState] = useState({ status: 'idle', contact: null, error: '' });

  async function reveal() {
    setState({ status: 'loading', contact: null, error: '' });
    try {
      const contact = await getPropertyContact(propertyId);
      setState({ status: 'ready', contact: contactLink(contact, title), error: '' });
    } catch (error) {
      setState({
        status: 'error',
        contact: null,
        error:
          error.status === 404
            ? 'El vendedor no tiene un medio de contacto disponible para esta propiedad.'
            : error.message,
      });
    }
  }

  if (state.status === 'ready') {
    const { contact } = state;
    return (
      <div className="border-primary-200 bg-primary-50 rounded-2xl border p-4">
        <p className="text-primary-800 text-xs font-semibold tracking-wide uppercase">
          {contact.label} del vendedor
        </p>
        {contact.href ? (
          <a
            href={contact.href}
            target={contact.external ? '_blank' : undefined}
            rel={contact.external ? 'noopener noreferrer' : undefined}
            className="text-primary-800 font-display mt-1 block text-lg font-semibold break-all underline-offset-4 hover:underline"
          >
            {contact.value}
          </a>
        ) : (
          <p className="text-ink mt-1 text-lg font-semibold break-all">{contact.value}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" fullWidth onClick={reveal} loading={state.status === 'loading'}>
        Contactar al vendedor
      </Button>
      {state.status === 'error' && (
        <Alert
          variant="warning"
          onClose={() => setState({ status: 'idle', contact: null, error: '' })}
        >
          {state.error}
        </Alert>
      )}
    </div>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinejoin="round"
        d="M12 20.5s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 3.1c0 5.7-7.5 10.1-7.5 10.1Z"
      />
    </svg>
  );
}

/** Guarda o quita la propiedad de favoritos; sin sesión, lleva al inicio de sesión. */
function FavoriteToggle({ propertyId }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [isFavorite, setIsFavorite] = useState(false);
  const [status, setStatus] = useState(isAuthenticated ? 'loading' : 'idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    favoriteService
      .listFavorites()
      .then((favorites) => {
        if (!active) return;
        setIsFavorite(favorites.some((item) => String(item.propertyId) === String(propertyId)));
        setStatus('idle');
      })
      .catch(() => active && setStatus('idle'));
    return () => {
      active = false;
    };
  }, [isAuthenticated, propertyId]);

  if (!isAuthenticated) {
    return (
      <Button
        variant="secondary"
        size="lg"
        fullWidth
        to={ROUTES.LOGIN}
        state={{ from: { pathname: location.pathname } }}
      >
        <HeartIcon /> Inicia sesión para guardar
      </Button>
    );
  }

  async function toggle() {
    setError('');
    setStatus('saving');
    try {
      if (isFavorite) {
        await favoriteService.removeFavorite(propertyId);
        setIsFavorite(false);
      } else {
        await favoriteService.addFavorite(propertyId);
        setIsFavorite(true);
      }
    } catch (caught) {
      setError(caught.message);
    } finally {
      setStatus('idle');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={isFavorite ? 'accent' : 'secondary'}
        size="lg"
        fullWidth
        onClick={toggle}
        loading={status === 'saving'}
        disabled={status === 'loading'}
        aria-pressed={isFavorite}
      >
        <HeartIcon filled={isFavorite} />
        {isFavorite ? 'Guardada en favoritos' : 'Guardar en favoritos'}
      </Button>
      {error && (
        <Alert variant="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
    </div>
  );
}

export default function PropertyActions({ propertyId, title, online = true }) {
  // Contactar y guardar consultan o modifican datos en el servidor: sin conexión no se ofrecen.
  if (!online) {
    return (
      <div className="flex flex-col gap-3">
        <Button size="lg" fullWidth disabled>
          Contactar al vendedor
        </Button>
        <Button variant="secondary" size="lg" fullWidth disabled>
          <HeartIcon /> Guardar en favoritos
        </Button>
        <p className="text-ink-muted text-sm">
          Contactar al vendedor y guardar en favoritos requieren conexión a Internet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ContactSeller propertyId={propertyId} title={title} />
      <FavoriteToggle propertyId={propertyId} />
    </div>
  );
}

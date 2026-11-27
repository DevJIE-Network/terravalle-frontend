import { useState } from 'react';
import { getPropertyContact } from '@/api';
import { FavoriteButton, HeartIcon } from '@/components/property';
import { Alert, Button } from '@/components/ui';
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
      <FavoriteButton variant="full" propertyId={propertyId} title={title} snapshot={{ title }} />
    </div>
  );
}

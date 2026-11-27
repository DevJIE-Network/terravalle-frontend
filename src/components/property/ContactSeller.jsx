import { useState } from 'react';
import { getPropertyContact } from '@/api';
import { Alert, Button } from '@/components/ui';
import { contactLink } from '@/utils/propertyDetail';

const NO_CONTACT_MESSAGE = 'El vendedor no tiene un medio de contacto disponible.';
const UNAVAILABLE_MESSAGE =
  'El contacto con el vendedor no está disponible para esta propiedad.';
const ERROR_MESSAGE =
  'No fue posible consultar la información de contacto. Intenta nuevamente.';

/**
 * HU-029 · Sección para contactar al vendedor desde la ficha pública (HU-028).
 *
 * El único origen del dato es el contrato autorizado por HU-013
 * (GET /properties/:id/contact): `{ type, value }`. No se consulta el perfil
 * privado del vendedor ni se guarda el contacto en la copia sin conexión.
 *
 * La petición es diferida: solo se hace cuando el comprador pulsa el botón y
 * la propiedad está disponible. TerraValle únicamente facilita el acceso al
 * medio autorizado; no interviene en la negociación ni en el pago.
 *
 * @param {object} props
 * @param {string|number} props.propertyId
 * @param {string} props.title Título de la propiedad, para el asunto del correo.
 * @param {boolean} [props.available] false si la propiedad está retirada/inactiva.
 */
export default function ContactSeller({ propertyId, title, available = true }) {
  const [state, setState] = useState({ status: 'idle', contact: null });

  if (!available) {
    return (
      <section aria-labelledby="contactar-vendedor-titulo">
        <h2 id="contactar-vendedor-titulo" className="text-ink text-base font-semibold">
          Contactar vendedor
        </h2>
        <p className="text-ink-muted mt-2 text-sm">{UNAVAILABLE_MESSAGE}</p>
      </section>
    );
  }

  async function reveal() {
    setState({ status: 'loading', contact: null });
    try {
      const contact = await getPropertyContact(propertyId);
      setState({
        status: contact?.value ? 'ready' : 'no-contact',
        contact: contact?.value ? contactLink(contact, title) : null,
      });
    } catch (error) {
      // 404/410 = el vendedor no publicó un medio autorizado o ya no aplica.
      setState({
        status: error?.status === 404 || error?.status === 410 ? 'no-contact' : 'error',
        contact: null,
      });
    }
  }

  if (state.status === 'ready') {
    const { contact } = state;
    return (
      <section aria-labelledby="contactar-vendedor-titulo">
        <h2 id="contactar-vendedor-titulo" className="text-ink text-base font-semibold">
          Contactar vendedor
        </h2>
        <div className="border-primary-200 bg-primary-50 mt-2 rounded-2xl border p-4">
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
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2" aria-labelledby="contactar-vendedor-titulo">
      <h2 id="contactar-vendedor-titulo" className="text-ink text-base font-semibold">
        Contactar vendedor
      </h2>
      <Button size="lg" fullWidth onClick={reveal} loading={state.status === 'loading'}>
        Contactar vendedor
      </Button>
      {state.status === 'no-contact' && (
        <p className="text-ink-muted text-sm" role="status">
          {NO_CONTACT_MESSAGE}
        </p>
      )}
      {state.status === 'error' && (
        <Alert variant="warning" onClose={() => setState({ status: 'idle', contact: null })}>
          {ERROR_MESSAGE}
        </Alert>
      )}
    </section>
  );
}

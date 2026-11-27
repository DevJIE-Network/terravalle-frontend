import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPropertyContact } from '@/api';
import ContactSeller from '@/components/property/ContactSeller';
import PropertyActions from '@/pages/PublicProperty/PropertyActions';
import { STORAGE_KEYS } from '@/utils/constants';
import { saveOfflineProperty } from '@/utils/offlineProperties';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getPropertyContact: vi.fn(),
  favoriteService: {
    listFavorites: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
  },
}));

const TITLE = 'Casa con alberca en Marina Vallarta';

function errorWithStatus(status) {
  return Object.assign(new Error('Falla del servidor'), { status });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('HU-029 · Contactar vendedor', () => {
  it('renderiza la sección con el título y la acción visibles', () => {
    render(<ContactSeller propertyId="15" title={TITLE} />);
    expect(screen.getByRole('heading', { name: 'Contactar vendedor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contactar vendedor' })).toBeInTheDocument();
    expect(getPropertyContact).not.toHaveBeenCalled();
  });

  it('propiedad activa con teléfono autorizado: muestra el número y enlace tel:', async () => {
    const user = userEvent.setup();
    getPropertyContact.mockResolvedValue({ type: 'phone', value: '(322) 123-4567' });
    render(<ContactSeller propertyId="15" title={TITLE} />);

    await user.click(screen.getByRole('button', { name: 'Contactar vendedor' }));
    expect(await screen.findByRole('link', { name: '(322) 123-4567' })).toHaveAttribute(
      'href',
      'tel:3221234567',
    );
    expect(screen.getByText('Teléfono del vendedor')).toBeInTheDocument();
  });

  it('propiedad activa con correo autorizado: muestra el correo y enlace mailto:', async () => {
    const user = userEvent.setup();
    getPropertyContact.mockResolvedValue({ type: 'email', value: 'vendedor@ejemplo.mx' });
    render(<ContactSeller propertyId="15" title={TITLE} />);

    await user.click(screen.getByRole('button', { name: 'Contactar vendedor' }));
    const link = await screen.findByRole('link', { name: 'vendedor@ejemplo.mx' });
    expect(link).toHaveAttribute(
      'href',
      'mailto:vendedor@ejemplo.mx?subject=Inter%C3%A9s%20en%3A%20Casa%20con%20alberca%20en%20Marina%20Vallarta',
    );
    expect(screen.getByText('Correo electrónico del vendedor')).toBeInTheDocument();
  });

  it('usa wa.me solo cuando el contrato devuelve whatsapp como medio autorizado', async () => {
    const user = userEvent.setup();
    getPropertyContact.mockResolvedValue({ type: 'whatsapp', value: '3221234567' });
    render(<ContactSeller propertyId="15" title={TITLE} />);

    await user.click(screen.getByRole('button', { name: 'Contactar vendedor' }));
    expect(await screen.findByRole('link', { name: '3221234567' })).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me/523221234567'),
    );
  });

  it('muestra loading mientras consulta el contacto', async () => {
    const user = userEvent.setup();
    let resolve;
    getPropertyContact.mockReturnValue(new Promise((done) => (resolve = done)));
    render(<ContactSeller propertyId="15" title={TITLE} />);

    await user.click(screen.getByRole('button', { name: 'Contactar vendedor' }));
    const button = screen.getByRole('button', { name: 'Contactar vendedor' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    resolve({ type: 'phone', value: '3221234567' });
    expect(await screen.findByRole('link', { name: '3221234567' })).toBeInTheDocument();
  });

  it('propiedad inactiva: informa que el contacto no está disponible sin consultar', () => {
    render(<ContactSeller propertyId="15" title={TITLE} available={false} />);
    expect(
      screen.getByText('El contacto con el vendedor no está disponible para esta propiedad.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Contactar vendedor' })).not.toBeInTheDocument();
    expect(getPropertyContact).not.toHaveBeenCalled();
  });

  it('propiedad retirada: no ofrece tel:, mailto: ni el botón', () => {
    const { container } = render(
      <ContactSeller propertyId="15" title={TITLE} available={false} />,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(getPropertyContact).not.toHaveBeenCalled();
  });

  it.each([404, 410])(
    'vendedor sin medio autorizado (HTTP %i): mensaje informativo y sin error visible',
    async (status) => {
      const user = userEvent.setup();
      getPropertyContact.mockRejectedValue(errorWithStatus(status));
      render(<ContactSeller propertyId="15" title={TITLE} />);

      await user.click(screen.getByRole('button', { name: 'Contactar vendedor' }));
      expect(
        await screen.findByText('El vendedor no tiene un medio de contacto disponible.'),
      ).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Contactar vendedor' }),
      ).toBeInTheDocument();
    },
  );

  it('respuesta sin valor: trata como ausencia de medio autorizado', async () => {
    const user = userEvent.setup();
    getPropertyContact.mockResolvedValue(null);
    render(<ContactSeller propertyId="15" title={TITLE} />);

    await user.click(screen.getByRole('button', { name: 'Contactar vendedor' }));
    expect(
      await screen.findByText('El vendedor no tiene un medio de contacto disponible.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('error de API: mensaje controlado y se puede cerrar para reintentar', async () => {
    const user = userEvent.setup();
    getPropertyContact.mockRejectedValueOnce(errorWithStatus(500));
    render(<ContactSeller propertyId="15" title={TITLE} />);

    await user.click(screen.getByRole('button', { name: 'Contactar vendedor' }));
    expect(
      await screen.findByText('No fue posible consultar la información de contacto. Intenta nuevamente.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    getPropertyContact.mockResolvedValueOnce({ type: 'phone', value: '3221234567' });
    await user.click(screen.getByRole('button', { name: 'Contactar vendedor' }));
    expect(await screen.findByRole('link', { name: '3221234567' })).toBeInTheDocument();
  });

  it('muestra exclusivamente el valor autorizado, sin datos privados adicionales', async () => {
    const user = userEvent.setup();
    // El servicio expone solo { type, value }; un hipotético campo extra no debe renderizarse.
    getPropertyContact.mockResolvedValue({
      type: 'email',
      value: 'autorizado@ejemplo.mx',
      privateEmail: 'privado@ejemplo.mx',
      address: 'Calle Privada 123',
      userId: 987,
      bankAccount: 'XXXX-1234',
    });
    render(<ContactSeller propertyId="15" title={TITLE} />);

    await user.click(screen.getByRole('button', { name: 'Contactar vendedor' }));
    const card = await screen.findByText('Correo electrónico del vendedor');
    expect(screen.getByText('autorizado@ejemplo.mx')).toBeInTheDocument();
    expect(card).toBeInTheDocument();
    expect(screen.queryByText('privado@ejemplo.mx')).not.toBeInTheDocument();
    expect(screen.queryByText(/Calle Privada/)).not.toBeInTheDocument();
    expect(screen.queryByText(/987/)).not.toBeInTheDocument();
    expect(screen.queryByText(/XXXX-1234/)).not.toBeInTheDocument();
  });

  it('no consulta dos veces al hacer clics repetidos tras cargar', async () => {
    const user = userEvent.setup();
    getPropertyContact.mockResolvedValue({ type: 'phone', value: '3221234567' });
    render(<ContactSeller propertyId="15" title={TITLE} />);

    const button = screen.getByRole('button', { name: 'Contactar vendedor' });
    await user.click(button);
    expect(await screen.findByRole('link', { name: '3221234567' })).toBeInTheDocument();
    expect(getPropertyContact).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Contactar vendedor' })).not.toBeInTheDocument();
  });

  it('no comunica a TerraValle como intermediario de la negociación', () => {
    render(<ContactSeller propertyId="15" title={TITLE} />);
    const text = document.body.textContent;
    expect(text).not.toMatch(/negocia|garantiza| avalúo|pago|contrato/i);
  });
});

/* ------------------------------------------------------------------ */
/* Regresión: aislamiento, PWA y validación de medios (auditoría final) */
/* ------------------------------------------------------------------ */

const PROPERTY_A = { id: '15', title: 'Casa A en Marina Vallarta', status: 'active' };
const PROPERTY_B = { id: '16', title: 'Casa B en Conchas Chinas', status: 'active' };

/** FavoriteButton usa useLocation: router estable para que rerender solo cambie PropertyActions. */
function renderActions(property, extra = {}) {
  return render(
    <MemoryRouter>
      <PropertyActions property={property} {...extra} />
    </MemoryRouter>,
  );
}

function rerenderActions(rerender, property) {
  rerender(
    <MemoryRouter>
      <PropertyActions property={property} />
    </MemoryRouter>,
  );
}

describe('HU-029 · Regresión de aislamiento entre propiedades', () => {
  it('al cambiar de propiedad no permanece el contacto de la anterior', async () => {
    const user = userEvent.setup();
    getPropertyContact.mockResolvedValue({ type: 'phone', value: '3221111111' });
    const { rerender } = renderActions(PROPERTY_A);

    await user.click(screen.getByRole('button', { name: 'Contactar vendedor' }));
    expect(await screen.findByRole('link', { name: '3221111111' })).toBeInTheDocument();

    // El Router reutiliza la ficha al cambiar el parámetro :id.
    rerenderActions(rerender, PROPERTY_B);

    expect(screen.queryByRole('link', { name: '3221111111' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contactar vendedor' })).toBeInTheDocument();
    expect(getPropertyContact).toHaveBeenCalledTimes(1);
  });

  it('una petición pendiente de A no puede mostrar su respuesta en la ficha B', async () => {
    let resolveA;
    const user = userEvent.setup();
    getPropertyContact.mockReturnValue(new Promise((resolve) => (resolveA = resolve)));
    const { rerender } = renderActions(PROPERTY_A);

    await user.click(screen.getByRole('button', { name: 'Contactar vendedor' }));
    expect(screen.getByRole('button', { name: 'Contactar vendedor' })).toHaveAttribute(
      'aria-busy',
      'true',
    );

    rerenderActions(rerender, PROPERTY_B);
    expect(screen.queryByRole('link', { name: '3221111111' })).not.toBeInTheDocument();

    resolveA({ type: 'phone', value: '3221111111' });
    await waitFor(() => expect(getPropertyContact).toHaveBeenCalledTimes(1));

    expect(screen.queryByRole('link', { name: '3221111111' })).not.toBeInTheDocument();
    expect(screen.queryByText('Teléfono del vendedor')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contactar vendedor' })).toBeInTheDocument();
  });

  it('la petición de B usa el id de B y no el de A', async () => {
    const user = userEvent.setup();
    getPropertyContact.mockResolvedValue({ type: 'email', value: 'b@ejemplo.mx' });
    const { rerender } = renderActions(PROPERTY_A);
    rerenderActions(rerender, PROPERTY_B);

    await user.click(screen.getByRole('button', { name: 'Contactar vendedor' }));
    expect(await screen.findByRole('link', { name: 'b@ejemplo.mx' })).toBeInTheDocument();
    expect(getPropertyContact).toHaveBeenCalledWith('16');
  });
});

describe('HU-029 · Regresión de medios autorizados', () => {
  it.each([
    ['telegram', '@vendedor'],
    ['sms', '3221234567'],
    ['phone', 'sin dígitos'],
    ['email', 'sin-arroba'],
    ['whatsapp', 'abc'],
  ])('tipo %s con valor %s no produce un enlace funcional', async (type, value) => {
    const user = userEvent.setup();
    getPropertyContact.mockResolvedValue({ type, value });
    renderActions(PROPERTY_A);

    await user.click(screen.getByRole('button', { name: 'Contactar vendedor' }));
    await waitFor(() => expect(getPropertyContact).toHaveBeenCalledWith('15'));

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText(/tel:|mailto:|wa\.me/)).not.toBeInTheDocument();
  });

  it.each([
    [{ type: 'phone', value: '(322) 123-4567' }, '(322) 123-4567', 'tel:3221234567'],
    [
      { type: 'whatsapp', value: '3221234567' },
      '3221234567',
      expect.stringContaining('wa.me/523221234567'),
    ],
    [
      { type: 'email', value: 'v@ejemplo.mx' },
      'v@ejemplo.mx',
      expect.stringContaining('mailto:v@ejemplo.mx'),
    ],
  ])('acepta el medio autorizado %j', async (contact, name, href) => {
    const user = userEvent.setup();
    getPropertyContact.mockResolvedValue(contact);
    renderActions(PROPERTY_A);

    await user.click(screen.getByRole('button', { name: 'Contactar vendedor' }));
    expect(await screen.findByRole('link', { name })).toHaveAttribute('href', href);
  });
});

describe('HU-029 · Regresión PWA / privacidad', () => {
  it('la copia offline de la ficha no contiene el contacto del vendedor', () => {
    const property = { ...PROPERTY_A, price: 100 };
    saveOfflineProperty(property, { nearbyPlaces: 'nota' });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.OFFLINE_PROPERTIES));
    expect(stored).toHaveLength(1);
    expect(stored[0].property).toEqual(property);
    expect(stored[0].notes).toEqual({ nearbyPlaces: 'nota' });
    expect(JSON.stringify(stored)).not.toMatch(/contact|phone|whatsapp|email|tel:|mailto:/i);
  });

  it('sin conexión no se ofrece el mecanismo de contacto ni se consulta HU-013', () => {
    renderActions(PROPERTY_A, { online: false });

    expect(screen.getByRole('button', { name: 'Contactar vendedor' })).toBeDisabled();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(getPropertyContact).not.toHaveBeenCalled();
  });
});

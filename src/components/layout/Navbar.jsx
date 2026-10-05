import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AUTH_NAV_LINKS, GUEST_NAV_LINKS, ROUTES } from '@/utils/constants';
import { cn } from '@/utils/helpers';

/** Clases de un enlace según si está activo y si es la versión móvil o de escritorio. */
function linkClasses({ isActive, mobile }) {
  return cn(
    'rounded-lg font-medium transition-colors',
    mobile ? 'block px-4 py-3 text-base' : 'px-3 py-2 text-sm',
    isActive
      ? 'bg-primary-100 text-primary-800'
      : 'text-ink-muted hover:bg-surface-muted hover:text-primary-700',
  );
}

function MenuIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6">
      {open ? (
        <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}

/**
 * Menú principal.
 * - Celular (< md): botón hamburguesa que despliega el menú bajo el encabezado.
 * - Escritorio (≥ md): enlaces en horizontal.
 * Las opciones cambian según haya sesión o no (ver GUEST_NAV_LINKS / AUTH_NAV_LINKS
 * en src/utils/constants.js). Un visitante nunca ve opciones protegidas.
 */
export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const links = isAuthenticated ? AUTH_NAV_LINKS : GUEST_NAV_LINKS;
  const closeMenu = () => setIsOpen(false);

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate(ROUTES.HOME);
  };

  // Cerrar el menú móvil con la tecla Escape.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const renderItems = (mobile) => (
    <>
      {links.map((link) => (
        <li key={link.to}>
          <NavLink
            to={link.to}
            onClick={closeMenu}
            className={({ isActive }) => linkClasses({ isActive, mobile })}
          >
            {link.label}
          </NavLink>
        </li>
      ))}
      {isAuthenticated && (
        <li>
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'w-full rounded-lg text-left font-medium text-red-700 transition-colors hover:bg-red-50',
              mobile ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm',
            )}
          >
            Cerrar sesión
          </button>
        </li>
      )}
    </>
  );

  return (
    <nav aria-label="Menú principal">
      {/* Escritorio */}
      <ul className="hidden items-center gap-1 md:flex">{renderItems(false)}</ul>

      {/* Celular: botón hamburguesa */}
      <button
        type="button"
        className="text-primary-800 hover:bg-surface-muted -mr-2 rounded-lg p-2 md:hidden"
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        onClick={() => setIsOpen((open) => !open)}
      >
        <MenuIcon open={isOpen} />
      </button>

      {/* Celular: panel desplegable */}
      {isOpen && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full border-b border-stone-200 bg-white shadow-md md:hidden"
        >
          <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">{renderItems(true)}</ul>
        </div>
      )}
    </nav>
  );
}

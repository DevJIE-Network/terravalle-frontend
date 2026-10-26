/** Nombre visible de la aplicación. */
export const APP_NAME = 'TerraValle';

/**
 * URL base de la API. Sale SOLO de la configuración del ambiente (VITE_API_URL):
 *   - npm run dev   → .env.development
 *   - npm run build → .env.production
 * Un archivo .env.local (no se sube a GitHub) puede sobrescribirla en tu computadora.
 */
export const API_URL = import.meta.env.VITE_API_URL;

/**
 * Rutas de la aplicación. Úsalas siempre en lugar de escribir el texto a mano:
 *   <Link to={ROUTES.CATALOG}>  /  navigate(ROUTES.LOGIN)
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/registro',
  CATALOG: '/catalogo',
  MY_PROPERTIES: '/mis-propiedades',
  CREATE_PROPERTY: '/mis-propiedades/nueva',
  FAVORITES: '/favoritos',
  PROFILE: '/perfil',
  NOT_FOUND: '/404',
};

/** Claves usadas en localStorage. */
export const STORAGE_KEYS = {
  SESSION: 'terravalle_session',
};

/** Opciones del menú para visitantes (sin sesión). */
export const GUEST_NAV_LINKS = [
  { to: ROUTES.CATALOG, label: 'Catálogo' },
  { to: ROUTES.LOGIN, label: 'Iniciar sesión' },
  { to: ROUTES.REGISTER, label: 'Registrarse' },
];

/** Opciones del menú para usuarios autenticados ("Cerrar sesión" se agrega en el Navbar). */
export const AUTH_NAV_LINKS = [
  { to: ROUTES.MY_PROPERTIES, label: 'Mis propiedades' },
  { to: ROUTES.FAVORITES, label: 'Favoritos' },
  { to: ROUTES.PROFILE, label: 'Perfil' },
];

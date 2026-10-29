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
  PROPERTY_ESTIMATION: '/mis-propiedades/:id/estimacion',
  PROPERTY_DIMENSIONS: '/mis-propiedades/:id/dimensiones',
  FAVORITES: '/favoritos',
  PROFILE: '/perfil',
  NOT_FOUND: '/404',
};

/**
 * Ruta de la estimación orientativa de una propiedad (HU-009).
 * @example buildPropertyEstimationPath(7) // "/mis-propiedades/7/estimacion"
 * @param {string|number} propertyId
 * @returns {string}
 */
export function buildPropertyEstimationPath(propertyId) {
  return ROUTES.PROPERTY_ESTIMATION.replace(':id', encodeURIComponent(String(propertyId)));
}

/**
 * Ruta del formulario de dimensiones y construcción de una propiedad (HU-021).
 * @example buildPropertyDimensionsPath(7) // "/mis-propiedades/7/dimensiones"
 * @param {string|number} propertyId
 * @returns {string}
 */
export function buildPropertyDimensionsPath(propertyId) {
  return ROUTES.PROPERTY_DIMENSIONS.replace(':id', encodeURIComponent(String(propertyId)));
}

/** Opciones de "estado general" de la construcción (HU-021). */
export const CONSTRUCTION_CONDITIONS = [
  { value: 'excellent', label: 'Excelente' },
  { value: 'good', label: 'Bueno' },
  { value: 'fair', label: 'Regular' },
  { value: 'needs_repair', label: 'Requiere reparaciones' },
];

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

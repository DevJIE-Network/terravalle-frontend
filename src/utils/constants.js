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
  PROPERTY_SERVICES: '/mis-propiedades/:id/servicios',
  PROPERTY_LOCATION: '/mis-propiedades/:id/ubicacion',
  PROPERTY_EDIT: '/mis-propiedades/:id/editar',
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

/**
 * Ruta del formulario de servicios de una propiedad (HU-022).
 * @example buildPropertyServicesPath(7) // "/mis-propiedades/7/servicios"
 * @param {string|number} propertyId
 * @returns {string}
 */
export function buildPropertyServicesPath(propertyId) {
  return ROUTES.PROPERTY_SERVICES.replace(':id', encodeURIComponent(String(propertyId)));
}

/**
 * Ruta de la ubicación y entorno de una propiedad (HU-023).
 * @example buildPropertyLocationPath(7) // "/mis-propiedades/7/ubicacion"
 * @param {string|number} propertyId
 * @returns {string}
 */
export function buildPropertyLocationPath(propertyId) {
  return ROUTES.PROPERTY_LOCATION.replace(':id', encodeURIComponent(String(propertyId)));
}

/**
 * Ruta de la edición de los datos generales de una propiedad (HU-024).
 * @example buildPropertyEditPath(7) // "/mis-propiedades/7/editar"
 * @param {string|number} propertyId
 * @returns {string}
 */
export function buildPropertyEditPath(propertyId) {
  return ROUTES.PROPERTY_EDIT.replace(':id', encodeURIComponent(String(propertyId)));
}

/**
 * Tipos de propiedad (los mismos ids que usa el registro de HU-020).
 * CreatePropertyPage conserva su propia copia; conviene unificarlas cuando se pueda.
 */
export const PROPERTY_TYPES = [
  { id: 1, name: 'Terreno' },
  { id: 2, name: 'Casa' },
  { id: 3, name: 'Departamento' },
  { id: 4, name: 'Otro' },
];

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

import { ROUTES } from './constants';

/**
 * Une clases de Tailwind ignorando valores vacíos o falsos.
 * @example cn('px-4', isActive && 'bg-primary-600', className)
 * @param {...(string|false|null|undefined)} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Formatea una cantidad como moneda mexicana.
 * @example formatPrice(1500000) // "$1,500,000"
 * @param {number} value
 * @returns {string}
 */
export function formatPrice(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Indica si un token JWT ya venció (según su campo `exp`).
 * Si el token no es un JWT o no trae `exp`, se considera vigente y la validez
 * la decide el backend (responderá 401 cuando corresponda).
 * @param {string | null | undefined} token
 * @returns {boolean}
 */
export function isTokenExpired(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

/**
 * Ruta a la que se debe volver después de iniciar sesión.
 * Usa la página privada que se intentó abrir (`location.state.from`) o el inicio.
 * @param {{ pathname?: string, search?: string, hash?: string } | null | undefined} from
 * @returns {string}
 */
export function resolveRedirectPath(from) {
  const pathname = from?.pathname;
  const isInternal = typeof pathname === 'string' && pathname.startsWith('/') && !pathname.startsWith('//');
  const isAuthScreen = pathname === ROUTES.LOGIN || pathname === ROUTES.REGISTER;

  if (!isInternal || isAuthScreen) return ROUTES.HOME;
  return `${pathname}${from.search ?? ''}${from.hash ?? ''}`;
}

/**
 * Valida el formato básico de un correo: texto@dominio.ext, sin espacios y con una sola @.
 * Se implementa sin expresión regular para evitar retroceso (backtracking) costoso.
 * @example isValidEmail('ana@correo.com') // true
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidEmail(value) {
  if (typeof value !== 'string' || value.length > 254 || /\s/.test(value)) return false;

  const at = value.indexOf('@');
  if (at < 1 || at !== value.lastIndexOf('@')) return false;

  // El dominio debe tener un punto que no esté al inicio ni al final.
  const domain = value.slice(at + 1);
  return domain.slice(1, -1).includes('.');
}

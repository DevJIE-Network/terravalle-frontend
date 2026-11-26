import { API_URL } from '@/utils/constants';

/**
 * Convierte la URL de una imagen guardada por el backend en una URL que el navegador pueda abrir.
 * - Las URL absolutas (http/https) se usan tal cual.
 * - Las rutas relativas del backend (ej. /uploads/properties/foto.jpg) se sirven desde el
 *   mismo servidor que la API, no desde el frontend.
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function resolveMediaUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  const value = url.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (!value.startsWith('/') || !API_URL) return value;
  try {
    return new URL(value, new URL(API_URL).origin).toString();
  } catch {
    return value;
  }
}

/**
 * Copias locales de fichas públicas que el usuario ya abrió, para consultarlas sin conexión.
 *
 * Estrategia de caché:
 * - Los recursos estáticos (HTML, JS, CSS, íconos) los precarga el Service Worker.
 * - Los datos de una ficha cambian, así que siempre se piden primero a la red; esta copia
 *   solo se usa cuando no hay conexión y se marca con la fecha en que se guardó.
 * - Se guardan pocas fichas (las más recientes) y caducan después de 30 días.
 * - Solo se guardan datos públicos de la ficha; nunca el contacto del vendedor ni datos de sesión.
 */
import { STORAGE_KEYS } from './constants';

export const MAX_OFFLINE_PROPERTIES = 15;
export const OFFLINE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function readEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_PROPERTIES);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((entry) => entry && entry.id != null && entry.property)
      : [];
  } catch {
    return [];
  }
}

function writeEntries(entries) {
  let toSave = entries;
  // Si el navegador se queda sin espacio, se descartan las copias más antiguas.
  while (toSave.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_PROPERTIES, JSON.stringify(toSave));
      return;
    } catch {
      toSave = toSave.slice(0, -1);
    }
  }
  try {
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_PROPERTIES);
  } catch {
    // Almacenamiento no disponible: la app sigue funcionando en línea.
  }
}

function isFresh(entry, now) {
  return Number.isFinite(entry.savedAt) && now - entry.savedAt <= OFFLINE_MAX_AGE_MS;
}

/** Guarda (o renueva) la copia local de una ficha recién obtenida de la red. */
export function saveOfflineProperty(property, notes = {}, now = Date.now()) {
  if (!property || property.id == null) return;
  const id = String(property.id);
  const others = readEntries().filter((entry) => entry.id !== id && isFresh(entry, now));
  writeEntries([{ id, savedAt: now, property, notes }, ...others].slice(0, MAX_OFFLINE_PROPERTIES));
}

/** Copia local vigente de una ficha, o null si nunca se guardó o ya caducó. */
export function getOfflineProperty(propertyId, now = Date.now()) {
  const id = String(propertyId);
  const entry = readEntries().find((item) => item.id === id);
  return entry && isFresh(entry, now) ? entry : null;
}

/** Quita la copia de una ficha que dejó de estar disponible (404/410). */
export function removeOfflineProperty(propertyId) {
  const id = String(propertyId);
  const entries = readEntries();
  const remaining = entries.filter((entry) => entry.id !== id);
  if (remaining.length !== entries.length) writeEntries(remaining);
}

/** Resumen de las fichas guardadas, de la más reciente a la más antigua. */
export function listOfflineProperties(now = Date.now()) {
  return readEntries()
    .filter((entry) => isFresh(entry, now))
    .map((entry) => ({
      id: entry.id,
      title: entry.property.title,
      propertyType: entry.property.propertyType?.name ?? null,
      savedAt: entry.savedAt,
    }));
}

/** El error ocurrió porque no hubo respuesta del servidor (sin conexión o tiempo agotado). */
export function isNetworkError(error) {
  if (!error || error.status != null) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error.code);
}

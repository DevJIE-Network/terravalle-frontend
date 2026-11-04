/*
 * HU-022 · Selección de servicios disponibles en la propiedad.
 * Lógica pura (sin React) para poder probarla por separado.
 */

/** Leyenda obligatoria: los datos son declarativos (regla de negocio). */
export const SERVICES_DISCLAIMER =
  'La información de servicios es declarativa: la captura el vendedor y TerraValle no certifica su disponibilidad, contratación ni que estén al corriente.';

/**
 * Ícono por servicio del catálogo. El API no envía el ícono, así que se asigna por nombre
 * (mismos valores que la columna services.icon de la migración 003).
 */
const ICON_BY_NAME = {
  'agua potable': 'droplet',
  electricidad: 'zap',
  drenaje: 'waves',
  gas: 'flame',
  internet: 'wifi',
  'alumbrado publico': 'lamp',
  pavimentacion: 'road',
  banqueta: 'footprints',
};

/** Quita acentos y mayúsculas para comparar nombres ("Alumbrado público" → "alumbrado publico"). */
function normalizeName(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replaceAll(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Ícono del servicio; si el catálogo crece con uno nuevo se usa un ícono genérico.
 * @param {{ name: string }} service
 * @returns {string}
 */
export function serviceIconName(service) {
  return ICON_BY_NAME[normalizeName(service?.name)] ?? 'check';
}

/**
 * Ids seleccionados a partir de los servicios guardados. Un Set impide duplicados.
 * @param {Array<{ id: number|string }>} services
 * @returns {Set<number>}
 */
export function selectionFromServices(services) {
  return new Set((services ?? []).map((service) => Number(service.id)));
}

/**
 * Marca o desmarca un servicio sin mutar la selección original.
 * @param {Set<number>} selection
 * @param {number} serviceId
 * @returns {Set<number>}
 */
export function toggleService(selection, serviceId) {
  const next = new Set(selection);
  if (next.has(serviceId)) {
    next.delete(serviceId);
  } else {
    next.add(serviceId);
  }
  return next;
}

/**
 * ¿Dos selecciones tienen exactamente los mismos servicios?
 * @param {Set<number>} a
 * @param {Set<number>} b
 * @returns {boolean}
 */
export function isSameSelection(a, b) {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

/**
 * Cuerpo para PUT /properties/:id/services. Solo envía ids que existen en el catálogo
 * (no se permite texto libre) y en el orden del catálogo.
 * @param {Set<number>} selection
 * @param {Array<{ id: number }>} catalog
 * @returns {number[]}
 */
export function toServiceIds(selection, catalog) {
  return catalog.map((service) => Number(service.id)).filter((id) => selection.has(id));
}

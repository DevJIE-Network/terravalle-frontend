import {
  buildPropertyDimensionsPath,
  buildPropertyEditPath,
  buildPropertyLocationPath,
  buildPropertyServicesPath,
} from '@/utils/constants';

/*
 * Estimación orientativa del valor.
 * Lógica pura para poder probarla por separado de la página.
 */

/** Tiempo tras el cual se avisa que la estimación está tardando más de lo normal. */
export const SLOW_ESTIMATION_MS = 8000;

/**
 * Acceso directo a la sección que corrige cada dato faltante (CA2).
 * Las claves son los `field` que devuelve el backend en `details.missing`.
 */
const SECTION_LINKS = {
  characteristics: { build: buildPropertyDimensionsPath, label: 'Completar dimensiones' },
  builtArea: { build: buildPropertyDimensionsPath, label: 'Completar dimensiones' },
  location: { build: buildPropertyLocationPath, label: 'Completar ubicación' },
  services: { build: buildPropertyServicesPath, label: 'Completar servicios' },
};

/**
 * @param {{ field: string }} item dato faltante que reportó el backend
 * @param {string|number} propertyId
 * @returns {{ to: string, label: string }}
 */
export function missingDataLink(item, propertyId) {
  const link = SECTION_LINKS[item?.field];
  if (link) return { to: link.build(propertyId), label: link.label };
  return { to: buildPropertyEditPath(propertyId), label: 'Completar datos generales' };
}

/**
 * Quita duplicados por sección para no repetir el mismo acceso directo.
 * @param {Array<{ field: string }>} missing
 * @param {string|number} propertyId
 * @returns {Array<{ to: string, label: string }>}
 */
export function uniqueMissingLinks(missing, propertyId) {
  const seen = new Set();
  const links = [];
  for (const item of missing ?? []) {
    const link = missingDataLink(item, propertyId);
    if (!seen.has(link.to)) {
      seen.add(link.to);
      links.push(link);
    }
  }
  return links;
}

/**
 * ¿El error fue porque la petición tardó demasiado?
 * @param {{ code?: string|null }} error
 * @returns {boolean}
 */
export function isTimeoutError(error) {
  return error?.code === 'ECONNABORTED';
}

/**
 * Texto del modelo solo cuando el backend lo informa ("cuando aplique").
 * @param {{ modelName?: string|null, modelVersion?: string|null }} estimation
 * @returns {string}
 */
export function modelLabel(estimation) {
  const name = estimation?.modelName?.trim();
  const version = estimation?.modelVersion?.trim();
  if (name && version) return `Modelo ${name} · versión ${version}`;
  if (version) return `Versión del modelo ${version}`;
  if (name) return `Modelo ${name}`;
  return '';
}

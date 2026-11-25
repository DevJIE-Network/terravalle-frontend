/*
 * Búsqueda y filtros del catálogo: lógica pura (sin React) para poder probarla por separado.
 *
 * Flujo: los criterios viven en la URL (?q=...&minPrice=...). De ahí salen "valores" (texto tal cual
 * se escribió) que se validan antes de consultar y se convierten en "filtros" (tipos reales) con el
 * mismo contrato que el backend (GET /properties).
 */
import { PROPERTY_TYPES } from './constants';
import { formatPrice } from './helpers';

/** Mismos límites que valida el backend. */
export const CATALOG_FILTER_LIMITS = {
  price: 999_999_999_999.99,
  area: 10_000_000,
  text: 120,
  search: 100,
  services: 30,
};

/** Nombres de los parámetros: son los de la URL y los de la consulta del backend. */
export const CATALOG_FILTER_KEYS = [
  'q',
  'propertyTypeId',
  'minPrice',
  'maxPrice',
  'state',
  'municipality',
  'minLandArea',
  'maxLandArea',
  'hasConstruction',
  'serviceIds',
];

/** Valores de un formulario sin criterios (todo texto, como lo escribe el usuario). */
export const EMPTY_FILTER_VALUES = Object.freeze({
  q: '',
  propertyTypeId: '',
  minPrice: '',
  maxPrice: '',
  state: '',
  municipality: '',
  minLandArea: '',
  maxLandArea: '',
  hasConstruction: '',
  serviceIds: [],
});

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const ID_PATTERN = /^\d+$/;

const numberFormat = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });

const cleanText = (value) =>
  String(value ?? '')
    .trim()
    .replaceAll(/\s+/g, ' ');

/** Lee los criterios de la URL como texto. Ignora los parámetros que no son del catálogo. */
export function valuesFromSearchParams(searchParams) {
  const read = (key) => (searchParams.get(key) ?? '').trim();
  return {
    q: read('q'),
    propertyTypeId: read('propertyTypeId'),
    minPrice: read('minPrice'),
    maxPrice: read('maxPrice'),
    state: read('state'),
    municipality: read('municipality'),
    minLandArea: read('minLandArea'),
    maxLandArea: read('maxLandArea'),
    hasConstruction: read('hasConstruction'),
    serviceIds: searchParams
      .getAll('serviceIds')
      .flatMap((item) => item.split(','))
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

function parseAmount(raw, max) {
  const text = String(raw ?? '').trim();
  if (text === '') return { empty: true };
  if (!AMOUNT_PATTERN.test(text)) {
    return { error: 'Ingresa un número mayor o igual a 0, con máximo dos decimales.' };
  }
  const value = Number(text);
  if (value > max) return { error: `No puede ser mayor que ${numberFormat.format(max)}.` };
  return { value };
}

const RANGES = [
  {
    min: 'minPrice',
    max: 'maxPrice',
    limit: CATALOG_FILTER_LIMITS.price,
    minMessage: 'El precio mínimo no puede ser mayor que el máximo.',
    maxMessage: 'El precio máximo no puede ser menor que el mínimo.',
  },
  {
    min: 'minLandArea',
    max: 'maxLandArea',
    limit: CATALOG_FILTER_LIMITS.area,
    minMessage: 'La superficie mínima no puede ser mayor que la máxima.',
    maxMessage: 'La superficie máxima no puede ser menor que la mínima.',
  },
];

function validateRange(range, values, filters, errors) {
  const parsed = { min: parseAmount(values[range.min], range.limit) };
  parsed.max = parseAmount(values[range.max], range.limit);

  for (const side of ['min', 'max']) {
    const key = range[side];
    if (parsed[side].error) errors[key] = parsed[side].error;
    else if (!parsed[side].empty) filters[key] = parsed[side].value;
  }

  // Regla de negocio: el mínimo no puede ser mayor que el máximo.
  if (filters[range.min] !== undefined && filters[range.max] !== undefined) {
    if (filters[range.min] > filters[range.max]) {
      errors[range.min] = range.minMessage;
      errors[range.max] = range.maxMessage;
      delete filters[range.min];
      delete filters[range.max];
    }
  }
}

function validateText(values, key, limit, label, filters, errors) {
  const text = cleanText(values[key]);
  if (text.length > limit) errors[key] = `${label} no puede superar ${limit} caracteres.`;
  else if (text) filters[key] = text;
}

function validateServices(values, filters, errors) {
  const raw = (values.serviceIds ?? []).map((item) => String(item).trim()).filter(Boolean);
  if (raw.length === 0) return;
  if (!raw.every((item) => ID_PATTERN.test(item) && Number(item) > 0)) {
    errors.serviceIds = 'Selecciona servicios válidos del catálogo.';
    return;
  }
  const ids = [...new Set(raw.map(Number))];
  if (ids.length > CATALOG_FILTER_LIMITS.services) {
    errors.serviceIds = `Puedes filtrar por máximo ${CATALOG_FILTER_LIMITS.services} servicios.`;
    return;
  }
  filters.serviceIds = ids;
}

/**
 * Valida los criterios ANTES de consultar (CA4).
 * @param {Partial<typeof EMPTY_FILTER_VALUES>} values Criterios como texto.
 * @returns {{ filters: object, errors: Record<string, string> }}
 *   `filters` solo trae los criterios con valor y ya con su tipo (números, booleano, ids).
 *   `errors` tiene un mensaje por campo inválido; con errores no se debe enviar la consulta.
 */
export function validateCatalogFilters(values) {
  const v = { ...EMPTY_FILTER_VALUES, ...values };
  const filters = {};
  const errors = {};

  validateText(v, 'q', CATALOG_FILTER_LIMITS.search, 'La búsqueda', filters, errors);

  const typeId = String(v.propertyTypeId ?? '').trim();
  if (typeId !== '') {
    if (PROPERTY_TYPES.some((type) => String(type.id) === typeId)) {
      filters.propertyTypeId = Number(typeId);
    } else {
      errors.propertyTypeId = 'Selecciona un tipo de inmueble válido.';
    }
  }

  validateRange(RANGES[0], v, filters, errors);
  validateText(v, 'state', CATALOG_FILTER_LIMITS.text, 'El estado', filters, errors);
  validateText(v, 'municipality', CATALOG_FILTER_LIMITS.text, 'El municipio', filters, errors);
  validateRange(RANGES[1], v, filters, errors);

  const construction = String(v.hasConstruction ?? '').trim();
  if (construction === 'true' || construction === 'false') {
    filters.hasConstruction = construction === 'true';
  } else if (construction !== '') {
    errors.hasConstruction = 'Selecciona una opción válida.';
  }

  validateServices(v, filters, errors);

  return { filters, errors };
}

/** Criterios → parámetros de la URL, en orden estable (misma búsqueda = misma dirección). */
export function toSearchParams(filters) {
  const params = new URLSearchParams();
  for (const key of CATALOG_FILTER_KEYS) {
    const value = filters[key];
    if (value === undefined || value === null || value === '') continue;
    if (key === 'serviceIds') {
      if (value.length > 0) params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  }
  return params;
}

const formatArea = (value) => `${numberFormat.format(value)} m²`;

function rangeLabel(name, min, max, format) {
  if (min !== undefined && max !== undefined) return `${name}: ${format(min)} – ${format(max)}`;
  if (min !== undefined) return `${name}: desde ${format(min)}`;
  return `${name}: hasta ${format(max)}`;
}

/**
 * Etiquetas de los filtros activos (siempre visibles y removibles uno por uno).
 * @param {object} filters
 * @param {Array<{ id: number, name: string }>} [services] Catálogo, para mostrar el nombre.
 * @returns {Array<{ id: string, label: string, keys: string[], serviceId?: number }>}
 */
export function describeActiveFilters(filters, services = []) {
  const chips = [];
  const add = (id, label, keys, extra) => chips.push({ id, label, keys, ...extra });

  if (filters.q) add('q', `Búsqueda: “${filters.q}”`, ['q']);

  if (filters.propertyTypeId !== undefined) {
    const type = PROPERTY_TYPES.find((item) => item.id === filters.propertyTypeId);
    add('propertyTypeId', `Tipo: ${type?.name ?? filters.propertyTypeId}`, ['propertyTypeId']);
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    add('price', rangeLabel('Precio', filters.minPrice, filters.maxPrice, formatPrice), [
      'minPrice',
      'maxPrice',
    ]);
  }

  if (filters.state) add('state', `Estado: ${filters.state}`, ['state']);
  if (filters.municipality)
    add('municipality', `Municipio: ${filters.municipality}`, ['municipality']);

  if (filters.minLandArea !== undefined || filters.maxLandArea !== undefined) {
    add(
      'landArea',
      rangeLabel('Superficie', filters.minLandArea, filters.maxLandArea, formatArea),
      ['minLandArea', 'maxLandArea'],
    );
  }

  if (filters.hasConstruction !== undefined) {
    add('hasConstruction', filters.hasConstruction ? 'Con construcción' : 'Sin construcción', [
      'hasConstruction',
    ]);
  }

  for (const serviceId of filters.serviceIds ?? []) {
    const service = services.find((item) => Number(item.id) === serviceId);
    add(`service-${serviceId}`, `Servicio: ${service?.name ?? `#${serviceId}`}`, ['serviceIds'], {
      serviceId,
    });
  }

  return chips;
}

/** Criterios sin el que representa la etiqueta (sin modificar el original). */
export function removeFilter(filters, chip) {
  const next = { ...filters };
  if (chip.serviceId === undefined) {
    for (const key of chip.keys) delete next[key];
    return next;
  }
  next.serviceIds = (filters.serviceIds ?? []).filter((id) => id !== chip.serviceId);
  if (next.serviceIds.length === 0) delete next.serviceIds;
  return next;
}

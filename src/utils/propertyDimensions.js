import { CONSTRUCTION_CONDITIONS } from './constants';

/**
 * Lógica pura del formulario de dimensiones y construcción (HU-021).
 * Vive aparte de la página para poder probarla sin renderizar nada.
 */

/** Campos que el vendedor captura siempre (terreno). */
export const LAND_FIELDS = ['landArea', 'frontage', 'depth'];

/** Campos que solo aplican cuando existe construcción. */
export const CONSTRUCTION_FIELDS = [
  'builtArea',
  'bedrooms',
  'bathrooms',
  'floors',
  'parkingSpaces',
  'age',
  'condition',
];

/** Límites razonables para capturar enteros (evitan errores de dedo como 9999 baños). */
export const INTEGER_LIMITS = {
  bedrooms: { min: 0, max: 99 },
  bathrooms: { min: 0, max: 99 },
  floors: { min: 1, max: 99 },
  parkingSpaces: { min: 0, max: 99 },
  age: { min: 0, max: 200 },
};

/** Tolerancia para avisar que frente × fondo no coincide con la superficie del terreno. */
const AREA_MISMATCH_TOLERANCE = 0.3;

/** Estado inicial del formulario. `hasConstruction` queda vacío para obligar a elegir. */
export const EMPTY_FORM = {
  landArea: '',
  frontage: '',
  depth: '',
  hasConstruction: '', // '' | 'yes' | 'no'
  builtArea: '',
  bedrooms: '',
  bathrooms: '',
  floors: '',
  parkingSpaces: '',
  age: '',
  condition: '',
};

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;
const INTEGER_PATTERN = /^-?\d+$/;

/**
 * Convierte el texto de un campo en número, o explica por qué no se puede.
 * @param {unknown} raw Texto capturado.
 * @param {{ integer?: boolean }} [options]
 * @returns {{ value: number } | { reason: 'required' | 'invalid' | 'negative' }}
 */
export function parseNumber(raw, { integer = false } = {}) {
  const text = String(raw ?? '').trim();
  if (text === '') return { reason: 'required' };

  const pattern = integer ? INTEGER_PATTERN : DECIMAL_PATTERN;
  if (!pattern.test(text)) return { reason: 'invalid' };

  const value = Number(text);
  if (value < 0) return { reason: 'negative' };
  return { value };
}

/** Mensaje de error para un campo numérico, o '' si es válido. */
function numberError(field, raw, { integer = false, positive = false } = {}) {
  const parsed = parseNumber(raw, { integer });

  if (parsed.reason === 'required') return 'Este campo es obligatorio.';
  if (parsed.reason === 'negative') return 'No se permiten valores negativos.';
  if (parsed.reason === 'invalid') {
    return integer
      ? 'Ingresa solo números enteros, sin letras ni decimales.'
      : 'Ingresa solo un número (por ejemplo, 250.5).';
  }

  const { value } = parsed;
  if (positive && value === 0) return 'El valor debe ser mayor que cero.';

  const limits = INTEGER_LIMITS[field];
  if (limits && (value < limits.min || value > limits.max)) {
    return `El valor debe estar entre ${limits.min} y ${limits.max}.`;
  }
  return '';
}

/**
 * Valida el formulario completo.
 * - Terreno: superficie, frente y fondo deben ser números positivos.
 * - Construcción: solo se exige (y valida) si `hasConstruction === 'yes'`.
 * - `warnings` son avisos de consistencia que NO bloquean el guardado.
 * @param {typeof EMPTY_FORM} form
 * @returns {{ errors: Record<string, string>, warnings: string[] }}
 */
export function validateDimensions(form) {
  const errors = {};

  for (const field of LAND_FIELDS) {
    const message = numberError(field, form[field], { positive: true });
    if (message) errors[field] = message;
  }

  if (form.hasConstruction !== 'yes' && form.hasConstruction !== 'no') {
    errors.hasConstruction = 'Indica si la propiedad tiene construcción.';
  }

  if (form.hasConstruction === 'yes') {
    const builtAreaError = numberError('builtArea', form.builtArea, { positive: true });
    if (builtAreaError) errors.builtArea = builtAreaError;

    for (const field of ['bedrooms', 'bathrooms', 'parkingSpaces', 'age']) {
      const message = numberError(field, form[field], { integer: true });
      if (message) errors[field] = message;
    }

    // Una construcción tiene al menos un piso: 0 no tiene sentido aquí.
    const floorsError = numberError('floors', form.floors, { integer: true, positive: true });
    if (floorsError) errors.floors = floorsError;

    if (!CONSTRUCTION_CONDITIONS.some((option) => option.value === form.condition)) {
      errors.condition = 'Selecciona el estado general de la construcción.';
    }
  }

  return { errors, warnings: Object.keys(errors).length ? [] : buildWarnings(form) };
}

/** Avisos de consistencia (no bloquean). Solo se calculan con datos ya válidos. */
function buildWarnings(form) {
  const warnings = [];
  const landArea = parseNumber(form.landArea).value;
  const frontage = parseNumber(form.frontage).value;
  const depth = parseNumber(form.depth).value;

  if (landArea && frontage && depth) {
    const product = frontage * depth;
    if (Math.abs(product - landArea) / landArea > AREA_MISMATCH_TOLERANCE) {
      warnings.push(
        `Frente × fondo da ${formatArea(product)}, que difiere de la superficie del terreno (${formatArea(landArea)}). Si el terreno es irregular puedes ignorar este aviso.`,
      );
    }
  }

  if (form.hasConstruction === 'yes') {
    const builtArea = parseNumber(form.builtArea).value;
    const floors = parseNumber(form.floors, { integer: true }).value;
    if (landArea && builtArea && floors && builtArea > landArea * floors) {
      warnings.push(
        `La superficie construida (${formatArea(builtArea)}) es mayor que la del terreno por el número de pisos (${formatArea(landArea * floors)}). Revisa que los datos sean correctos.`,
      );
    }
  }

  return warnings;
}

/** @example formatArea(250.5) // "250.5 m²" */
export function formatArea(value) {
  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)} m²`;
}

/**
 * Convierte lo que devuelve el backend en valores de formulario (texto).
 * @param {object|null|undefined} dimensions
 * @returns {typeof EMPTY_FORM}
 */
export function formFromDimensions(dimensions) {
  if (!dimensions) return { ...EMPTY_FORM };

  const text = (value) => (value === null || value === undefined ? '' : String(value));
  let hasConstruction = '';
  if (dimensions.hasConstruction === true) hasConstruction = 'yes';
  if (dimensions.hasConstruction === false) hasConstruction = 'no';

  return {
    landArea: text(dimensions.landArea),
    frontage: text(dimensions.frontage),
    depth: text(dimensions.depth),
    hasConstruction,
    builtArea: text(dimensions.builtArea),
    bedrooms: text(dimensions.bedrooms),
    bathrooms: text(dimensions.bathrooms),
    floors: text(dimensions.floors),
    parkingSpaces: text(dimensions.parkingSpaces),
    age: text(dimensions.age),
    condition: text(dimensions.condition),
  };
}

/**
 * Arma el cuerpo que se envía al backend a partir de un formulario YA validado.
 * Sin construcción, los campos de edificación viajan en `null` (así se limpian si antes existían).
 * @param {typeof EMPTY_FORM} form
 */
export function toDimensionsPayload(form) {
  const hasConstruction = form.hasConstruction === 'yes';
  const number = (value) => Number(String(value).trim());

  return {
    landArea: number(form.landArea),
    frontage: number(form.frontage),
    depth: number(form.depth),
    hasConstruction,
    builtArea: hasConstruction ? number(form.builtArea) : null,
    bedrooms: hasConstruction ? number(form.bedrooms) : null,
    bathrooms: hasConstruction ? number(form.bathrooms) : null,
    floors: hasConstruction ? number(form.floors) : null,
    parkingSpaces: hasConstruction ? number(form.parkingSpaces) : null,
    age: hasConstruction ? number(form.age) : null,
    condition: hasConstruction ? form.condition : null,
  };
}

/** Indica si dos formularios tienen el mismo contenido (ignora campos ocultos sin construcción). */
export function isSameForm(a, b) {
  const fields = ['hasConstruction', ...LAND_FIELDS];
  if (a.hasConstruction === 'yes' && b.hasConstruction === 'yes') {
    fields.push(...CONSTRUCTION_FIELDS);
  }
  return fields.every((field) => String(a[field]).trim() === String(b[field]).trim());
}

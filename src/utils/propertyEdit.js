import { PROPERTY_TYPES } from './constants';

/**
 * Lógica pura de la edición de datos generales de una propiedad (HU-024, reglas de HU-008):
 * título de 3 a 150 caracteres, descripción de hasta 3000, precio ≥ 0 con máximo 2 decimales
 * y tipo de propiedad existente. Descripción y precio pueden quitarse dejándolos vacíos.
 */

export const TITLE_MIN = 3;
export const TITLE_MAX = 150;
export const DESCRIPTION_MAX = 3000;

export const EMPTY_EDIT_FORM = {
  title: '',
  propertyTypeId: '',
  description: '',
  publicationPrice: '',
};

const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

/** Convierte la propiedad del backend en valores de formulario (texto). */
export function formFromProperty(property) {
  if (!property) return { ...EMPTY_EDIT_FORM };
  const text = (value) => (value === null || value === undefined ? '' : String(value));
  return {
    title: text(property.title),
    propertyTypeId: text(property.propertyTypeId),
    description: text(property.description),
    publicationPrice: text(property.publicationPrice),
  };
}

/** @returns {Record<string, string>} errores por campo ({} si todo es válido) */
export function validateEditForm(form) {
  const errors = {};
  const title = form.title.trim();

  if (!title) errors.title = 'El título es obligatorio.';
  else if (title.length < TITLE_MIN) {
    errors.title = `El título debe tener al menos ${TITLE_MIN} caracteres.`;
  } else if (title.length > TITLE_MAX) {
    errors.title = `El título no puede superar los ${TITLE_MAX} caracteres.`;
  }

  if (!PROPERTY_TYPES.some((type) => String(type.id) === String(form.propertyTypeId))) {
    errors.propertyTypeId = 'Selecciona un tipo de propiedad.';
  }

  if (form.description.trim().length > DESCRIPTION_MAX) {
    errors.description = `La descripción no puede superar los ${DESCRIPTION_MAX} caracteres.`;
  }

  const price = form.publicationPrice.trim();
  if (price !== '') {
    if (price.startsWith('-')) errors.publicationPrice = 'El precio no puede ser negativo.';
    else if (!PRICE_PATTERN.test(price)) {
      errors.publicationPrice = 'Ingresa un precio válido, con máximo 2 decimales.';
    }
  }

  return errors;
}

/** Valores normalizados tal como se envían al backend (para comparar y para armar el cuerpo). */
function normalize(form) {
  const price = form.publicationPrice.trim();
  return {
    title: form.title.trim(),
    propertyTypeId: Number(form.propertyTypeId),
    description: form.description.trim() || null,
    publicationPrice: price === '' ? null : Number(price),
  };
}

/**
 * Cuerpo del PATCH: SOLO lo que cambió respecto al formulario guardado.
 * ({} significa "sin cambios": el backend rechaza un PATCH vacío, así que no se envía.)
 */
export function toChanges(form, baseline) {
  const next = normalize(form);
  const previous = normalize(baseline);
  const changes = {};
  for (const key of Object.keys(next)) {
    if (next[key] !== previous[key]) changes[key] = next[key];
  }
  return changes;
}

export const hasChanges = (form, baseline) => Object.keys(toChanges(form, baseline)).length > 0;

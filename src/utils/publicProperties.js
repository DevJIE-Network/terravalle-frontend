import { formatPrice } from './helpers';

export const PUBLIC_PROPERTIES_PAGE_SIZE = 12;

function nonNegativeNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

/** Reutiliza el formato monetario de TerraValle, haciendo explícita la moneda. */
export function formatMxnPrice(value) {
  const number = nonNegativeNumber(value);
  return number === null ? 'Precio por consultar' : `${formatPrice(number)} MXN`;
}

export function formatPropertyArea(value) {
  const number = nonNegativeNumber(value);
  return number === null
    ? 'Superficie no disponible'
    : `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(number)} m²`;
}

/** Solo municipio y estado; no expone direcciones completas ni coordenadas. */
export function summarizePropertyLocation(location) {
  return (
    [location?.municipality, location?.state]
      .filter((part) => typeof part === 'string' && part.trim())
      .map((part) => part.trim())
      .join(', ') || 'Ubicación no disponible'
  );
}

export function getPublicPropertyType(propertyType) {
  return (typeof propertyType === 'string' ? propertyType : propertyType?.name) || 'Propiedad';
}

/** Usa únicamente primaryPhoto del contrato público, no las fotos privadas del dueño. */
export function getPublicPhotoUrl(primaryPhoto) {
  const url = typeof primaryPhoto === 'string' ? primaryPhoto : primaryPhoto?.url;
  return typeof url === 'string' && url.trim() ? url.trim() : null;
}

/** Conserva la primera aparición y el orden recibido, sin modificar las listas originales. */
export function appendUniqueProperties(current, incoming) {
  const seen = new Set();
  return [...current, ...incoming].filter((property) => {
    if (property?.id === null || property?.id === undefined) return false;
    const id = String(property.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

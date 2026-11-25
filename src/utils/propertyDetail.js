/*
 * Ficha pública de una propiedad: lógica pura (sin React) para poder probarla por separado.
 */
import { resolveMediaUrl } from './media';

const numberFormat = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });

const isPresent = (value) => value !== null && value !== undefined && value !== '';

/** "1,250 m²" o null si no hay dato. */
export function formatSquareMeters(value) {
  return isPresent(value) && Number.isFinite(Number(value))
    ? `${numberFormat.format(Number(value))} m²`
    : null;
}

/** Distancias siempre rotuladas como aproximadas: "≈ 350 m", "≈ 2.1 km". */
export function formatApproxDistance(meters) {
  if (!isPresent(meters) || !Number.isFinite(Number(meters))) return 'Distancia no registrada';
  const value = Number(meters);
  if (value < 1000) return `≈ ${Math.round(value)} m`;
  return `≈ ${numberFormat.format(Math.round(value / 100) / 10)} km`;
}

const CONDITION_LABELS = {
  excelente: 'Excelente',
  bueno: 'Bueno',
  regular: 'Regular',
  malo: 'Requiere reparaciones',
};

const QUALITY_LABELS = {
  economica: 'Económica',
  media: 'Media',
  residencial: 'Residencial',
  lujo: 'Lujo',
};

/**
 * Filas de "Terreno" que tienen dato. Las vacías se omiten (regla: no mostrar secciones vacías).
 * @returns {Array<{ label: string, value: string }>}
 */
export function dimensionRows(dimensions) {
  if (!dimensions) return [];
  return [
    ['Superficie del terreno', formatSquareMeters(dimensions.landArea)],
    [
      'Frente',
      isPresent(dimensions.frontage) ? `${numberFormat.format(dimensions.frontage)} m` : null,
    ],
    ['Fondo', isPresent(dimensions.depth) ? `${numberFormat.format(dimensions.depth)} m` : null],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => ({ label, value }));
}

/** Filas de "Construcción" que tienen dato. */
export function constructionRows(construction) {
  if (!construction) return [];
  const plural = (count, one, many) => `${numberFormat.format(count)} ${count === 1 ? one : many}`;
  return [
    ['Superficie construida', formatSquareMeters(construction.builtArea)],
    ['Recámaras', isPresent(construction.bedrooms) ? String(construction.bedrooms) : null],
    [
      'Baños',
      isPresent(construction.bathrooms) ? numberFormat.format(construction.bathrooms) : null,
    ],
    ['Niveles', isPresent(construction.floors) ? String(construction.floors) : null],
    [
      'Estacionamientos',
      isPresent(construction.parkingSpaces) ? String(construction.parkingSpaces) : null,
    ],
    [
      'Antigüedad',
      isPresent(construction.constructionAge)
        ? construction.constructionAge === 0
          ? 'A estrenar'
          : plural(construction.constructionAge, 'año', 'años')
        : null,
    ],
    ['Estado general', CONDITION_LABELS[construction.generalCondition] ?? null],
    ['Calidad de construcción', QUALITY_LABELS[construction.constructionQuality] ?? null],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => ({ label, value }));
}

/** Fotos con URL utilizable, la principal primero. */
export function galleryPhotos(photos) {
  return (photos ?? [])
    .map((photo) => ({ ...photo, src: resolveMediaUrl(photo?.imageUrl) }))
    .filter((photo) => photo.src)
    .sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)));
}

/** Dirección legible sin el número interior (el backend tampoco lo publica). */
export function addressLines(location) {
  if (!location) return null;
  const street = [location.street, location.exteriorNumber].filter(Boolean).join(' ');
  const area = [location.neighborhood, location.postalCode && `C.P. ${location.postalCode}`]
    .filter(Boolean)
    .join(', ');
  const city = [location.municipality, location.state].filter(Boolean).join(', ');
  const lines = [street, area, city].filter(Boolean);
  return lines.length ? lines : null;
}

/** ¿Hay coordenadas válidas para dibujar el mapa? */
export function hasCoordinates(location) {
  const lat = Number(location?.latitude);
  const lng = Number(location?.longitude);
  return (
    isPresent(location?.latitude) &&
    isPresent(location?.longitude) &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/** URL del mapa embebido de OpenStreetMap centrado en la propiedad. */
export function mapEmbedUrl({ latitude, longitude }, delta = 0.006) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta]
    .map((n) => n.toFixed(5))
    .join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

/** Enlace para abrir el punto en OpenStreetMap en otra pestaña. */
export function mapLinkUrl({ latitude, longitude }) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
}

/** Agrupa los puntos cercanos por categoría, conservando el orden por distancia del backend. */
export function groupNearbyPlaces(places) {
  const groups = new Map();
  for (const place of places ?? []) {
    const name = place?.category?.name ?? 'Otros';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(place);
  }
  return [...groups.entries()].map(([category, items]) => ({ category, items }));
}

const CONTACT_LABELS = { phone: 'Teléfono', whatsapp: 'WhatsApp', email: 'Correo electrónico' };

/**
 * Enlace y texto para el medio de contacto autorizado.
 * @param {{ type: string, value: string }} contact
 * @returns {{ label: string, value: string, href: string|null, external: boolean }}
 */
export function contactLink(contact, propertyTitle = '') {
  const value = String(contact?.value ?? '').trim();
  const digits = value.replaceAll(/\D/g, '');
  const label = CONTACT_LABELS[contact?.type] ?? 'Contacto';

  if (contact?.type === 'whatsapp' && digits) {
    const number = digits.length === 10 ? `52${digits}` : digits;
    const text = encodeURIComponent(
      `Hola, me interesa la propiedad "${propertyTitle}" que vi en TerraValle.`,
    );
    return { label, value, href: `https://wa.me/${number}?text=${text}`, external: true };
  }
  if (contact?.type === 'phone' && digits) {
    return { label, value, href: `tel:${digits}`, external: false };
  }
  if (contact?.type === 'email' && value.includes('@')) {
    const subject = encodeURIComponent(`Interés en: ${propertyTitle}`);
    return { label, value, href: `mailto:${value}?subject=${subject}`, external: false };
  }
  return { label, value, href: null, external: false };
}

/** ¿El error significa que la publicación no existe o ya no está disponible? */
export function isUnavailableError(error) {
  return error?.status === 404 || error?.status === 410;
}

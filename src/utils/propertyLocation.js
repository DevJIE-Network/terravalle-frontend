/**
 * Lógica pura de la sección "Ubicación y entorno" (HU-023).
 * Vive aparte de la página para probarla sin renderizar nada.
 *
 * Campos reales del contrato del backend (property-location.schema):
 *   street, exteriorNumber, interiorNumber, neighborhood, municipality, state,
 *   postalCode, country, latitude, longitude, formattedAddress.
 * Todos son opcionales, pero debe haber al menos UNA vía de ubicación:
 *   municipio + estado, dirección completa o el par de coordenadas.
 */

/** Mensaje que comparte el frontend con el backend cuando falta toda la información. */
export const INSUFFICIENT_LOCATION_MESSAGE =
  'Debes proporcionar una dirección válida o coordenadas de la propiedad.';

/** Aviso declarativo de la sección (la ubicación es manual y declarativa). */
export const LOCATION_DISCLAIMER =
  'La ubicación se registra manualmente y cada propiedad conserva una sola ubicación principal: la de su dirección del inmueble.';

/** Formulario vacío. Latitud/longitud como texto porque se capturan a mano. */
export const EMPTY_LOCATION_FORM = {
  street: '',
  exteriorNumber: '',
  interiorNumber: '',
  neighborhood: '',
  municipality: '',
  state: '',
  postalCode: '',
  country: '',
  latitude: '',
  longitude: '',
  formattedAddress: '',
};

/** Campos de texto del formulario, con su longitud máxima según el contrato. */
export const LOCATION_TEXT_MAX = {
  street: 150,
  exteriorNumber: 20,
  interiorNumber: 20,
  neighborhood: 120,
  municipality: 120,
  state: 120,
  postalCode: 10,
  country: 80,
  formattedAddress: 500,
};

/** Campos que se envían como texto plano en el PUT. */
const TEXT_FIELDS = Object.keys(LOCATION_TEXT_MAX);

/**
 * Precarga el formulario desde la ubicación guardada (o vacío si no hay).
 * @param {object|null} location
 * @returns {object} Forma del formulario.
 */
export function formFromLocation(location) {
  const form = { ...EMPTY_LOCATION_FORM };
  if (!location) return form;
  for (const field of Object.keys(form)) {
    if (location[field] !== null && location[field] !== undefined) {
      form[field] = String(location[field]);
    }
  }
  return form;
}

/** ¿Cambió algo respecto a lo guardado? (compara texto recortado) */
export function locationFormHasChanges(form, baseline) {
  return TEXT_FIELDS.concat(['latitude', 'longitude']).some(
    (field) => (form[field] ?? '').trim() !== (baseline[field] ?? '').trim(),
  );
}

/**
 * Convierte el formulario al cuerpo del PUT: solo campos escritos,
 * y las coordenadas como números SOLO cuando ambas son válidas.
 * @param {object} form
 * @returns {object} Payload para savePropertyLocation.
 */
export function toLocationPayload(form) {
  const payload = {};
  for (const field of TEXT_FIELDS) {
    const value = (form[field] ?? '').trim();
    if (value) payload[field] = value;
  }
  const { latitude, longitude } = parseCoordinates(form);
  if (latitude !== null && longitude !== null) {
    payload.latitude = latitude;
    payload.longitude = longitude;
  }
  return payload;
}

/**
 * Interpreta las coordenadas escritas.
 * @returns {{ latitude: number|null, longitude: number|null, incomplete: boolean }}
 *   incomplete = una escrita y la otra vacía; un valor inválido se devuelve como null
 *   junto a los errores correspondientes en `validateLocationForm`.
 */
function parseCoordinates(form) {
  const rawLatitude = (form.latitude ?? '').trim();
  const rawLongitude = (form.longitude ?? '').trim();
  const latitude = rawLatitude === '' ? null : Number(rawLatitude);
  const longitude = rawLongitude === '' ? null : Number(rawLongitude);
  return {
    latitude: latitude !== null && Number.isFinite(latitude) ? latitude : null,
    longitude: longitude !== null && Number.isFinite(longitude) ? longitude : null,
    incomplete: (rawLatitude === '') !== (rawLongitude === ''),
  };
}

/**
 * Validaciones del formulario de ubicación (el backend sigue siendo la autoridad final).
 * @param {object} form
 * @returns {object} Mapa campo → mensaje.
 */
export function validateLocationForm(form) {
  const errors = {};
  const parsed = parseCoordinates(form);
  const latitudeRaw = String(form.latitude ?? '').trim();
  const longitudeRaw = String(form.longitude ?? '').trim();

  if (latitudeRaw !== '' && !Number.isFinite(Number(latitudeRaw))) {
    errors.latitude = 'La latitud debe ser un número, por ejemplo 20.0346.';
  } else if (parsed.latitude !== null && (parsed.latitude < -90 || parsed.latitude > 90)) {
    errors.latitude = 'La latitud debe estar entre -90 y 90.';
  }

  if (longitudeRaw !== '' && !Number.isFinite(Number(longitudeRaw))) {
    errors.longitude = 'La longitud debe ser un número, por ejemplo -99.2119.';
  } else if (parsed.longitude !== null && (parsed.longitude < -180 || parsed.longitude > 180)) {
    errors.longitude = 'La longitud debe estar entre -180 y 180.';
  }

  // Solo una de las dos coordenadas (como el contrato del backend).
  if (parsed.incomplete) {
    errors.latitude =
      errors.latitude ?? 'La latitud y longitud deben enviarse juntas.';
    errors.longitude =
      errors.longitude ?? 'La latitud y longitud deben enviarse juntas.';
  }

  const hasFullCoordinates =
    parsed.latitude !== null &&
    parsed.longitude !== null &&
    !errors.latitude &&
    !errors.longitude;
  const hasStructuredAddress = Boolean(
    (form.municipality ?? '').trim() && (form.state ?? '').trim(),
  );
  const hasFormattedAddress = Boolean((form.formattedAddress ?? '').trim());

  if (!hasFullCoordinates && !hasStructuredAddress && !hasFormattedAddress) {
    errors.formattedAddress = INSUFFICIENT_LOCATION_MESSAGE;
  }

  return errors;
}

/**
 * Distancia aproximada para mostrar, ej. "650 m aprox." o "1.4 km aprox.".
 * @param {number|null} meters
 * @returns {string|null} Texto listo para mostrar, o null si no hay distancia.
 */
export function formatApproxDistance(meters) {
  if (meters === null || meters === undefined || Number.isNaN(meters)) return null;
  if (meters < 1000) return `${meters} m aprox.`;
  const kilometers = Math.round(meters / 100) / 10; // 1 decimal, sin ceros finales
  return `${kilometers} km aprox.`;
}

/**
 * Ordena los puntos cercanos como el backend: distancia ascendente
 * (sin distancia al final) y en empate por nombre.
 * @param {Array<{ name: string, approximateDistanceM: number|null }>} places
 * @returns {Array}
 */
export function sortNearbyPlaces(places) {
  return [...places].sort((a, b) => {
    const distanceA = a.approximateDistanceM;
    const distanceB = b.approximateDistanceM;
    if (distanceA === null && distanceB === null) return compareNames(a, b);
    if (distanceA === null) return 1;
    if (distanceB === null) return -1;
    if (distanceA !== distanceB) return distanceA - distanceB;
    return compareNames(a, b);
  });
}

function compareNames(a, b) {
  return (a.name ?? '').localeCompare(b.name ?? '', 'es');
}

/**
 * Validaciones del formulario de punto cercano.
 * @param {object} form { categoryId, name, approximateDistanceM }
 * @returns {object} Mapa campo → mensaje.
 */
export function validateNearbyPlaceForm(form) {
  const errors = {};
  const name = (form.name ?? '').trim();

  if (!form.categoryId) {
    errors.categoryId = 'Selecciona una categoría.';
  }

  if (name.length < 2) {
    errors.name =
      name.length === 0
        ? 'El nombre es obligatorio.'
        : 'El nombre no puede ser tan corto.';
  } else if (name.length > 150) {
    errors.name = 'El nombre no puede superar los 150 caracteres.';
  }

  const rawDistance = (form.approximateDistanceM ?? '').trim();
  if (rawDistance !== '' && !Number.isInteger(Number(rawDistance))) {
    errors.approximateDistanceM = 'La distancia debe ser un número entero.';
  } else if (rawDistance !== '' && Number(rawDistance) < 0) {
    errors.approximateDistanceM = 'La distancia no puede ser negativa.';
  }

  return errors;
}

/** Cuerpo del POST para un punto cercano (solo campos escritos). */
export function toNearbyPlacePayload(form) {
  const payload = {
    categoryId: form.categoryId,
    name: (form.name ?? '').trim(),
  };
  const rawDistance = (form.approximateDistanceM ?? '').trim();
  if (rawDistance !== '') payload.approximateDistanceM = Number(rawDistance);
  return payload;
}

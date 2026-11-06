import {
  buildPropertyDimensionsPath,
  buildPropertyEditPath,
  buildPropertyServicesPath,
} from './constants';

/**
 * Lógica pura del panel "Mis propiedades" (HU-024).
 * Vive aparte de la página para probarla sin renderizar nada.
 */

/** Propiedades por página del panel. */
export const PAGE_SIZE = 12;

/**
 * Estados de publicación. El estado SIEMPRE se muestra con texto (no solo con color):
 * `label` es lo que ve el usuario y `visibility` aclara si los compradores la ven.
 */
export const STATUS_CONFIG = {
  draft: {
    label: 'Borrador',
    visibility: 'No visible para compradores',
    badge: 'bg-amber-100 text-amber-900',
    dot: 'bg-amber-500',
  },
  active: {
    label: 'Activa',
    visibility: 'Disponible en el catálogo',
    badge: 'bg-primary-100 text-primary-800',
    dot: 'bg-primary-600',
  },
  inactive: {
    label: 'Inactiva',
    visibility: 'No visible para compradores',
    badge: 'bg-stone-200 text-stone-800',
    dot: 'bg-stone-500',
  },
  withdrawn: {
    label: 'Retirada',
    visibility: 'Retirada definitivamente',
    badge: 'bg-red-100 text-red-800',
    dot: 'bg-red-600',
  },
};

/** Configuración del estado, con un respaldo para valores que el backend agregue después. */
export function getStatusConfig(status) {
  return (
    STATUS_CONFIG[status] ?? {
      label: String(status ?? 'Sin estado'),
      visibility: '',
      badge: 'bg-stone-200 text-stone-800',
      dot: 'bg-stone-500',
    }
  );
}

/** Opciones del filtro por estado ('' = todas). */
export const STATUS_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'draft', label: 'Borrador' },
  { value: 'active', label: 'Activas' },
  { value: 'inactive', label: 'Inactivas' },
  { value: 'withdrawn', label: 'Retiradas' },
];

/** Acciones que cambian el estado y el estado al que llevan. */
export const ACTION_CONFIG = {
  activate: { label: 'Activar', targetStatus: 'active' },
  deactivate: { label: 'Desactivar', targetStatus: 'inactive' },
  withdraw: { label: 'Retirar', targetStatus: 'withdrawn' },
};

/** Acciones permitidas por estado (refleja las transiciones válidas de HU-008). */
const ACTIONS_BY_STATUS = {
  draft: ['activate', 'withdraw'],
  active: ['deactivate', 'withdraw'],
  inactive: ['activate', 'withdraw'],
  withdrawn: [],
};

/** @returns {Array<'activate'|'deactivate'|'withdraw'>} */
export function getAvailableActions(status) {
  return ACTIONS_BY_STATUS[status] ?? [];
}

/** Una propiedad retirada es definitiva: no se edita ni se reactiva. */
export const isEditable = (property) => property?.status !== 'withdrawn';

/**
 * URL de la fotografía principal. Acepta las formas más probables del backend
 * (`primaryPhotoUrl`, `primaryPhoto.url` o `photos[]`). Devuelve null si no hay.
 * @param {object} property
 * @returns {string|null}
 */
export function getPrimaryPhotoUrl(property) {
  if (!property) return null;
  if (typeof property.primaryPhotoUrl === 'string' && property.primaryPhotoUrl) {
    return property.primaryPhotoUrl;
  }
  if (property.primaryPhoto?.url) return property.primaryPhoto.url;

  const photos = Array.isArray(property.photos) ? property.photos : [];
  const primary = photos.find((photo) => photo?.isPrimary) ?? photos[0];
  return primary?.url ?? null;
}

/**
 * Información pendiente de una propiedad, con el formulario donde se completa.
 * Solo se marca como pendiente lo que el backend indica EXPLÍCITAMENTE:
 *   - `hasDimensions === false`   → formulario de dimensiones (HU-021)
 *   - `servicesCount === 0` o `hasServices === false` → servicios (HU-022)
 *   - `publicationPrice === null` → edición (precio)
 * Si el backend no envía esos datos, no se inventa nada. Una propiedad retirada no tiene pendientes.
 * @param {object} property
 * @returns {Array<{ key: string, label: string, to: string }>}
 */
export function getPendingItems(property) {
  if (!property || property.status === 'withdrawn') return [];

  const items = [];
  if (property.hasDimensions === false) {
    items.push({
      key: 'dimensions',
      label: 'Dimensiones y construcción',
      to: buildPropertyDimensionsPath(property.id),
    });
  }
  if (property.servicesCount === 0 || property.hasServices === false) {
    items.push({
      key: 'services',
      label: 'Servicios disponibles',
      to: buildPropertyServicesPath(property.id),
    });
  }
  if (property.publicationPrice === null) {
    items.push({
      key: 'price',
      label: 'Precio de publicación',
      to: buildPropertyEditPath(property.id),
    });
  }
  return items;
}

/**
 * Aplica a la lista un cambio de estado ya confirmado por el backend:
 * actualiza la propiedad en su lugar, o la quita si ya no coincide con el filtro activo.
 * @param {object[]} properties
 * @param {object} updated Propiedad con su nuevo estado.
 * @param {string} statusFilter Filtro vigente ('' = todas).
 */
export function applyStatusChange(properties, updated, statusFilter) {
  if (statusFilter && updated.status !== statusFilter) {
    return properties.filter((item) => item.id !== updated.id);
  }
  return properties.map((item) => (item.id === updated.id ? updated : item));
}

/**
 * Textos del diálogo de confirmación y del aviso de éxito de cada acción.
 * @param {'activate'|'deactivate'|'withdraw'} action
 * @param {object} property
 * @param {Array<{ label: string }>} [pendingItems]
 */
export function describeAction(action, property, pendingItems = []) {
  const name = `«${property.title}»`;

  if (action === 'deactivate') {
    return {
      title: '¿Desactivar esta propiedad?',
      body: `${name} dejará de mostrarse como disponible para los compradores. Podrás volver a activarla cuando quieras.`,
      confirmLabel: 'Desactivar',
      variant: 'primary',
      success: `${name} ahora está inactiva y ya no se muestra como disponible.`,
    };
  }

  if (action === 'activate') {
    const pending = pendingItems.length
      ? ` Aún tiene información pendiente: ${pendingItems.map((item) => item.label).join(', ')}.`
      : '';
    return {
      title: '¿Activar esta propiedad?',
      body: `${name} se mostrará como disponible para los compradores.${pending}`,
      confirmLabel: 'Activar',
      variant: 'primary',
      success: `${name} ahora está activa y se muestra como disponible.`,
    };
  }

  return {
    title: '¿Retirar esta propiedad?',
    body: `${name} se retirará de forma definitiva: no podrás editarla, reactivarla ni volver a retirarla. La información se conserva solo para trazabilidad.`,
    confirmLabel: 'Retirar definitivamente',
    variant: 'danger',
    success: `${name} se retiró de tus publicaciones.`,
  };
}

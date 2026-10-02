/**
 * Une clases de Tailwind ignorando valores vacíos o falsos.
 * @example cn('px-4', isActive && 'bg-primary-600', className)
 * @param {...(string|false|null|undefined)} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Formatea una cantidad como moneda mexicana.
 * @example formatPrice(1500000) // "$1,500,000"
 * @param {number} value
 * @returns {string}
 */
export function formatPrice(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

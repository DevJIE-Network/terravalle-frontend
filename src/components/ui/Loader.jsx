import { cn } from '@/utils/helpers';

const SIZES = {
  sm: 'size-4 border-2',
  md: 'size-8 border-[3px]',
  lg: 'size-12 border-4',
};

/**
 * Indicador de carga (spinner).
 *
 * @param {object} props
 * @param {'sm'|'md'|'lg'} [props.size='md'] Tamaño del spinner.
 * @param {string} [props.label='Cargando...'] Texto visible debajo del spinner (y para lectores de pantalla).
 * @param {boolean} [props.hideLabel=false] Oculta el texto visualmente (sigue disponible para lectores).
 * @param {string} [props.className] Clases extra para el contenedor.
 *
 * @example <Loader />
 * @example <Loader size="sm" hideLabel />
 */
export default function Loader({
  size = 'md',
  label = 'Cargando...',
  hideLabel = false,
  className,
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-3', className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          'border-primary-200 border-t-primary-600 animate-spin rounded-full',
          SIZES[size],
        )}
      />
      <span className={cn('text-ink-muted text-sm', hideLabel && 'sr-only')}>{label}</span>
    </div>
  );
}

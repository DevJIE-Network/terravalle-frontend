import { cn } from '@/utils/helpers';

const VARIANTS = {
  success: {
    box: 'border-primary-200 bg-primary-50 text-primary-900',
    bar: 'bg-primary-600',
    icon: '✓',
  },
  error: { box: 'border-red-200 bg-red-50 text-red-800', bar: 'bg-red-600', icon: '!' },
  warning: { box: 'border-earth-200 bg-earth-50 text-earth-900', bar: 'bg-earth-600', icon: '!' },
  info: { box: 'border-sage-200 bg-sage-50 text-sage-900', bar: 'bg-sage-600', icon: 'i' },
};

/**
 * Mensaje de aviso dentro de la página.
 *
 * @param {object} props
 * @param {'success'|'error'|'warning'|'info'} [props.variant='info'] Tipo de aviso.
 * @param {string} [props.title] Título en negritas (opcional).
 * @param {import('react').ReactNode} props.children Texto del aviso.
 * @param {() => void} [props.onClose] Si se pasa, muestra un botón "×" para cerrar.
 * @param {string} [props.className] Clases extra.
 *
 * @example <Alert variant="success">Tu propiedad se publicó correctamente.</Alert>
 * @example
 * {error && <Alert variant="error" title="No se pudo guardar" onClose={() => setError(null)}>{error}</Alert>}
 */
export default function Alert({ variant = 'info', title, children, onClose, className }) {
  const styles = VARIANTS[variant] ?? VARIANTS.info;

  return (
    <div
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
      className={cn(
        'relative flex items-start gap-3 overflow-hidden rounded-2xl border py-4 pr-4 pl-5 text-sm',
        styles.box,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', styles.bar)} />
      <span
        aria-hidden="true"
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
          styles.bar,
        )}
      >
        {styles.icon}
      </span>
      <div className="min-w-0 flex-1 break-words">
        {title && <p className="mb-0.5 font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar aviso"
          className="-m-1 shrink-0 rounded p-1 text-lg leading-none opacity-70 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}

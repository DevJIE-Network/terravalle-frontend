import { cn } from '@/utils/helpers';

const VARIANTS = {
  success: { box: 'border-green-200 bg-green-50 text-green-800', icon: '✓' },
  error: { box: 'border-red-200 bg-red-50 text-red-800', icon: '!' },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-900', icon: '!' },
  info: { box: 'border-sky-200 bg-sky-50 text-sky-800', icon: 'i' },
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
      className={cn('flex items-start gap-3 rounded-lg border p-4 text-sm', styles.box, className)}
    >
      <span
        aria-hidden="true"
        className="flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold"
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

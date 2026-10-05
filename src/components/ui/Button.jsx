import { Link } from 'react-router-dom';
import { cn } from '@/utils/helpers';

const VARIANTS = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
  secondary:
    'bg-white text-primary-700 border border-primary-300 hover:bg-primary-50 active:bg-primary-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
};

const SIZES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

/**
 * Botón base de TerraValle.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'danger'} [props.variant='primary'] Estilo visual.
 * @param {'sm'|'md'|'lg'} [props.size='md'] Tamaño.
 * @param {boolean} [props.loading=false] Muestra un spinner y deshabilita el botón.
 * @param {boolean} [props.disabled=false] Deshabilita el botón.
 * @param {boolean} [props.fullWidth=false] Ocupa todo el ancho disponible.
 * @param {'button'|'submit'|'reset'} [props.type='button'] Tipo HTML del botón.
 * @param {string} [props.className] Clases extra de Tailwind.
 * @param {import('react').ReactNode} props.children Contenido del botón.
 * @param {string} [props.to] Si se pasa, se renderiza como enlace de React Router con estilo de botón.
 * Cualquier otra prop (onClick, aria-*, etc.) se pasa al <button> (o al <Link>).
 *
 * @example <Button onClick={guardar}>Guardar</Button>
 * @example <Button type="submit" loading={enviando} fullWidth>Crear cuenta</Button>
 * @example <Button variant="danger" onClick={eliminar}>Eliminar</Button>
 * @example <Button to="/catalogo" variant="secondary">Ver catálogo</Button>
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  to,
  className,
  children,
  ...rest
}) {
  const isDisabled = disabled || loading;
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

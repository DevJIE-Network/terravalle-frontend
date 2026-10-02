import { cn } from '@/utils/helpers';
import Button from './Button';

/**
 * Bloque para mostrar un error al cargar datos, con botón "Reintentar".
 * Pensado para usarse con el mensaje que ya trae el error del cliente HTTP.
 *
 * @param {object} props
 * @param {string} [props.title='Algo salió mal'] Título del bloque.
 * @param {string} props.message Mensaje para el usuario (usa `error.message` del cliente HTTP).
 * @param {() => void} [props.onRetry] Acción del botón "Reintentar". Si no se pasa, no hay botón.
 * @param {boolean} [props.retrying=false] Muestra el botón en estado de carga.
 * @param {string} [props.className] Clases extra.
 *
 * @example
 * if (error) return <ErrorState message={error.message} onRetry={cargarDatos} />;
 */
export default function ErrorState({
  title = 'Algo salió mal',
  message,
  onRetry,
  retrying = false,
  className,
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="mb-3 flex size-12 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-600"
      >
        !
      </div>
      <h3 className="text-base font-semibold text-red-800">{title}</h3>
      <p className="mt-1 max-w-md text-sm break-words text-red-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry} loading={retrying}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

import { useEffect, useId, useRef } from 'react';
import Alert from './Alert';
import Button from './Button';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled])';

/**
 * Diálogo modal de confirmación para acciones que cambian la visibilidad o son irreversibles.
 * Accesible: role="dialog" + aria-modal, el foco entra en "Cancelar" (la opción segura),
 * Tab no sale del diálogo, Esc o clic fuera cancelan, y al cerrar el foco vuelve a donde estaba.
 *
 * @param {object} props
 * @param {boolean} props.open Si se muestra.
 * @param {string} props.title Pregunta corta (ej. "¿Desactivar esta propiedad?").
 * @param {import('react').ReactNode} props.children Explicación de las consecuencias.
 * @param {string} [props.confirmLabel='Confirmar'] Texto del botón de confirmar.
 * @param {string} [props.cancelLabel='Cancelar'] Texto del botón de cancelar.
 * @param {'primary'|'danger'} [props.variant='primary'] Estilo del botón de confirmar.
 * @param {boolean} [props.loading=false] Mientras es true no se puede cancelar y se muestra el spinner.
 * @param {string} [props.error] Mensaje de error si la operación falló (el diálogo sigue abierto).
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 *
 * @example
 * <ConfirmDialog open={open} title="¿Retirar?" variant="danger" onConfirm={retirar} onCancel={cerrar}>
 *   Esta acción es definitiva.
 * </ConfirmDialog>
 */
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  loading = false,
  error,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);
  const cancelRef = useRef(null);
  const latest = useRef({ loading, onCancel });

  // Siempre el último `loading`/`onCancel`, sin volver a enfocar ni reiniciar listeners.
  useEffect(() => {
    latest.current = { loading, onCancel };
  });

  // Al abrir: recuerda el foco previo, enfoca "Cancelar" y bloquea el scroll de la página.
  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  // Teclado: Esc cancela y Tab se queda dentro del diálogo.
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!latest.current.loading) latest.current.onCancel();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = panelRef.current?.querySelectorAll(FOCUSABLE) ?? [];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-ink text-lg font-semibold">
          {title}
        </h2>
        <div id={descriptionId} className="text-ink-muted text-sm leading-relaxed">
          {children}
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

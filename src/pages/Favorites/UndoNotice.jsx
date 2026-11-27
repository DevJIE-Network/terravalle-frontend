import { useState } from 'react';
import { Alert, Button } from '@/components/ui';

/**
 * Aviso de que se quitó una propiedad, con la opción de deshacerlo (HU-030, CA4).
 * Se queda hasta que el usuario lo cierra, lo usa o sale de la pantalla: no desaparece solo, para
 * que quien tarda en leerlo (o usa lector de pantalla) no pierda la opción.
 *
 * @param {object} props
 * @param {string} props.title Nombre de la propiedad quitada.
 * @param {() => Promise<boolean>} props.onUndo Devuelve true si se restauró.
 * @param {() => void} props.onDismiss
 */
export default function UndoNotice({ title, onUndo, onDismiss }) {
  const [restoring, setRestoring] = useState(false);
  const [failed, setFailed] = useState(false);

  async function undo() {
    setRestoring(true);
    setFailed(false);
    const restored = await onUndo();
    // Si se restauró, la pantalla ya retiró este aviso.
    if (!restored) {
      setRestoring(false);
      setFailed(true);
    }
  }

  return (
    <Alert variant="info" onClose={onDismiss}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span>
          Quitaste «{title}» de tus favoritos.
          {failed && ' No pudimos restaurarla. Inténtalo de nuevo.'}
        </span>
        <Button variant="secondary" size="sm" onClick={undo} loading={restoring}>
          Deshacer
        </Button>
      </div>
    </Alert>
  );
}

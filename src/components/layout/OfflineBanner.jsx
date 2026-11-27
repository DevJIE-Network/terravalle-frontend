import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '@/hooks';

const BACK_ONLINE_MS = 5000;

/** Aviso global sin conexión y, al recuperarla, un aviso breve de que ya se puede actualizar. */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  const wasOffline = useRef(!online);
  const [backOnline, setBackOnline] = useState(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return undefined;
    }
    if (!wasOffline.current) return undefined;
    wasOffline.current = false;
    const show = setTimeout(() => setBackOnline(true), 0);
    const hide = setTimeout(() => setBackOnline(false), BACK_ONLINE_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [online]);

  if (!online) {
    return (
      <div role="status" className="bg-ink text-surface px-4 py-2 text-center text-sm">
        <span className="font-semibold">Sin conexión.</span> Estás viendo información guardada en
        este dispositivo que puede no estar actualizada. Publicar, editar, contactar y estimar con
        IA requieren Internet.
      </div>
    );
  }

  if (backOnline) {
    return (
      <div role="status" className="bg-primary-700 px-4 py-2 text-center text-sm text-white">
        <span className="font-semibold">Conexión restablecida.</span> La información se está
        actualizando con su versión vigente.
      </div>
    );
  }

  return null;
}

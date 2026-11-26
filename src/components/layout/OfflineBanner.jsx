import { useOnlineStatus } from '@/hooks';

/** Aviso global mientras el navegador no tiene conexión. */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div role="status" className="bg-ink text-surface px-4 py-2 text-center text-sm">
      <span className="font-semibold">Sin conexión.</span> Puedes consultar las fichas que ya
      abriste en este dispositivo; publicar, contactar y estimar requieren Internet.
    </div>
  );
}

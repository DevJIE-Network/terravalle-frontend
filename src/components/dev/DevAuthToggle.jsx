import { useState } from 'react';
import { DEMO_CREDENTIALS } from '@/context/demoSession';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/helpers';

/**
 * SOLO DESARROLLO: botón flotante para alternar entre visitante y usuario
 * autenticado y así probar el menú y las rutas protegidas sin backend.
 * Se monta en MainLayout únicamente cuando import.meta.env.DEV es true.
 */
export default function DevAuthToggle() {
  const { isAuthenticated, login, logout } = useAuth();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (isAuthenticated) {
      logout();
      return;
    }
    setBusy(true);
    try {
      await login(DEMO_CREDENTIALS);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title="Solo visible en desarrollo"
      className={cn(
        'fixed right-3 bottom-3 z-50 flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow-lg',
        'bg-stone-900/90 text-white hover:bg-stone-900 disabled:opacity-60',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-full', isAuthenticated ? 'bg-green-400' : 'bg-amber-400')}
      />
      DEV: {isAuthenticated ? 'Autenticado → salir' : 'Visitante → entrar'}
    </button>
  );
}

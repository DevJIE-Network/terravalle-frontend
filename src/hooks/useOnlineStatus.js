import { useSyncExternalStore } from 'react';

function subscribe(onChange) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

const getSnapshot = () => navigator.onLine !== false;
const getServerSnapshot = () => true;

/** true mientras el navegador reporta conexión; se actualiza con los eventos online/offline. */
export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

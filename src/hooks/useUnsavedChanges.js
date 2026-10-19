import { useCallback, useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

export const UNSAVED_CHANGES_MESSAGE = 'Tienes cambios sin guardar. ¿Deseas salir y descartarlos?';

// Indica si la pantalla actual tiene cambios sin guardar. Es un valor de módulo (no estado de
// React) para que el bloqueo de navegación y el botón "Cerrar sesión" lo lean al instante.
let hasPendingChanges = false;

/**
 * Pide confirmación si hay cambios sin guardar.
 * Úsalo antes de acciones que sacan al usuario de la pantalla sin navegar con un enlace
 * (por ejemplo, "Cerrar sesión").
 * @returns {boolean} true si se puede continuar (no había cambios o el usuario aceptó descartarlos)
 */
export function confirmDiscardChanges() {
  if (!hasPendingChanges) return true;
  const confirmed = window.confirm(UNSAVED_CHANGES_MESSAGE);
  if (confirmed) hasPendingChanges = false;
  return confirmed;
}

/**
 * Advierte al usuario antes de salir de la pantalla con cambios sin guardar (HU-019 CA4):
 * - Navegación dentro de la app (menú, enlaces, botón Atrás): confirmación antes de salir.
 * - Recargar o cerrar la pestaña: aviso nativo del navegador.
 * @param {boolean} when true mientras existan cambios sin guardar
 */
export function useUnsavedChanges(when) {
  useEffect(() => {
    hasPendingChanges = when;
    return () => {
      hasPendingChanges = false;
    };
  }, [when]);

  const shouldBlock = useCallback(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname !== nextLocation.pathname && !confirmDiscardChanges(),
    [],
  );
  const blocker = useBlocker(shouldBlock);

  // Si el usuario decide quedarse, se cancela la navegación pendiente.
  useEffect(() => {
    if (blocker.state === 'blocked') blocker.reset();
  }, [blocker]);

  useEffect(() => {
    if (!when) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [when]);
}

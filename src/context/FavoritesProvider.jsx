import { useCallback, useLayoutEffect, useMemo, useReducer, useRef } from 'react';
import { favoriteService } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { favoriteKey } from '@/utils/favorites';
import { FavoritesContext } from './FavoritesContext';
import { favoritesReducer, initialFavoritesState } from './favoritesState';

const MESSAGES = {
  load: 'No pudimos cargar tus favoritos. Revisa tu conexión e inténtalo de nuevo.',
  adding: 'No pudimos guardar la propiedad en favoritos. Inténtalo de nuevo.',
  removing: 'No pudimos quitar la propiedad de favoritos. Inténtalo de nuevo.',
  gone: 'Esta propiedad ya no está disponible para guardarla.',
};

function mutationMessage(kind, error) {
  if (kind === 'adding' && (error?.status === 404 || error?.status === 410)) return MESSAGES.gone;
  return error?.message || MESSAGES[kind];
}

/**
 * Proveedor de favoritos (HU-030). Va dentro de <AuthProvider> y comparte una sola lista entre el
 * catálogo, la ficha y "Mis favoritos", así el ícono se ve igual en las tres pantallas.
 *
 * - La lista se pide al servidor la primera vez que una pantalla la necesita (`ensureLoaded`).
 * - Guardar y quitar actualizan la pantalla de inmediato y se revierten si el backend falla.
 * - Una propiedad con una petición en curso ignora nuevos clics (no se guarda dos veces).
 * - Al iniciar o cerrar sesión se descarta todo, incluidas las respuestas pendientes.
 */
export function FavoritesProvider({ children }) {
  const { isAuthenticated, token } = useAuth();
  const [state, dispatch] = useReducer(favoritesReducer, initialFavoritesState);

  const stateRef = useRef(state);
  const generationRef = useRef(0);
  const inFlightRef = useRef(new Set());
  const loadingRef = useRef(false);
  const sessionKey = isAuthenticated ? (token ?? 'session') : null;
  const sessionKeyRef = useRef(sessionKey);

  // Layout effects: se ejecutan antes que los efectos de las pantallas hijas, que pueden pedir la
  // lista justo después de iniciar sesión.
  useLayoutEffect(() => {
    stateRef.current = state;
  });

  useLayoutEffect(() => {
    if (sessionKeyRef.current === sessionKey) return;
    sessionKeyRef.current = sessionKey;
    generationRef.current += 1;
    inFlightRef.current.clear();
    loadingRef.current = false;
    stateRef.current = initialFavoritesState;
    dispatch({ type: 'reset' });
  }, [sessionKey]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || loadingRef.current) return;
    const generation = generationRef.current;
    loadingRef.current = true;
    dispatch({ type: 'loadStart' });
    try {
      const items = await favoriteService.listFavorites();
      if (generationRef.current === generation) dispatch({ type: 'loadSuccess', items });
    } catch (error) {
      if (generationRef.current === generation) {
        dispatch({ type: 'loadFailure', message: error?.message || MESSAGES.load });
      }
    } finally {
      if (generationRef.current === generation) loadingRef.current = false;
    }
  }, [isAuthenticated]);

  const ensureLoaded = useCallback(() => {
    if (!stateRef.current.loaded) void refresh();
  }, [refresh]);

  const mutate = useCallback(
    async (kind, propertyId, { entry, index } = {}) => {
      const id = favoriteKey(propertyId);
      if (!isAuthenticated || inFlightRef.current.has(id)) return { ok: false, skipped: true };

      const { items } = stateRef.current;
      const position = items.findIndex((item) => favoriteKey(item.propertyId) === id);
      const saved = position !== -1;
      // Ya guardada: no se vuelve a guardar. No guardada: no hay nada que quitar.
      if ((kind === 'adding') === saved) return { ok: true, skipped: true };

      const target = kind === 'adding' ? (entry ?? { propertyId }) : items[position];
      const at = kind === 'adding' ? (index ?? 0) : position;
      const generation = generationRef.current;

      inFlightRef.current.add(id);
      dispatch({ type: 'mutateStart', id, kind, entry: target, index: at });
      try {
        if (kind === 'adding') await favoriteService.addFavorite(propertyId);
        else await favoriteService.removeFavorite(propertyId);
        if (generationRef.current === generation) dispatch({ type: 'mutateSuccess', id });
        return { ok: true, entry: target, index: at };
      } catch (error) {
        if (generationRef.current === generation) {
          const message = mutationMessage(kind, error);
          dispatch({ type: 'mutateFailure', id, kind, entry: target, index: at, message });
        }
        return { ok: false, error };
      } finally {
        if (generationRef.current === generation) inFlightRef.current.delete(id);
      }
    },
    [isAuthenticated],
  );

  const add = useCallback(
    (propertyId, snapshot) => mutate('adding', propertyId, { entry: { ...snapshot, propertyId } }),
    [mutate],
  );
  const remove = useCallback((propertyId) => mutate('removing', propertyId), [mutate]);
  const restore = useCallback(
    (entry, index) => mutate('adding', entry.propertyId, { entry, index }),
    [mutate],
  );
  const toggle = useCallback(
    (propertyId, snapshot) => {
      const id = favoriteKey(propertyId);
      const saved = stateRef.current.items.some((item) => favoriteKey(item.propertyId) === id);
      return saved ? remove(propertyId) : add(propertyId, snapshot);
    },
    [add, remove],
  );
  const clearError = useCallback(
    (propertyId) => dispatch({ type: 'clearError', id: favoriteKey(propertyId) }),
    [],
  );

  const ids = useMemo(
    () => new Set(state.items.map((item) => favoriteKey(item.propertyId))),
    [state.items],
  );
  const isFavorite = useCallback((propertyId) => ids.has(favoriteKey(propertyId)), [ids]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      loaded: state.loaded,
      loading: state.loading,
      loadError: state.loadError,
      items: state.items,
      busy: state.busy,
      errors: state.errors,
      isFavorite,
      ensureLoaded,
      refresh,
      add,
      remove,
      restore,
      toggle,
      clearError,
    }),
    [
      isAuthenticated,
      state,
      isFavorite,
      ensureLoaded,
      refresh,
      add,
      remove,
      restore,
      toggle,
      clearError,
    ],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

import { useContext } from 'react';
import { FavoritesContext } from '@/context/FavoritesContext';

/**
 * Favoritos del usuario, compartidos por el catálogo, la ficha y "Mis favoritos".
 * @example const { isFavorite, toggle } = useFavorites();
 * @returns {{
 *   isAuthenticated: boolean,
 *   loaded: boolean,
 *   loading: boolean,
 *   loadError: string,
 *   items: object[],
 *   busy: Record<string, 'adding'|'removing'>,
 *   errors: Record<string, string>,
 *   isFavorite: (propertyId: string|number) => boolean,
 *   ensureLoaded: () => void,
 *   refresh: () => Promise<void>,
 *   add: (propertyId: string|number, snapshot?: object) => Promise<{ ok: boolean, skipped?: boolean }>,
 *   remove: (propertyId: string|number) => Promise<{ ok: boolean, entry?: object, index?: number }>,
 *   restore: (entry: object, index: number) => Promise<{ ok: boolean }>,
 *   toggle: (propertyId: string|number, snapshot?: object) => Promise<{ ok: boolean }>,
 *   clearError: (propertyId: string|number) => void,
 * }}
 */
export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites() debe usarse dentro de <FavoritesProvider>.');
  }
  return context;
}

/**
 * Igual que useFavorites(), pero devuelve null si no hay <FavoritesProvider>.
 * Lo usa el ícono de favorito para que el catálogo se pueda mostrar sin ese proveedor.
 */
export function useOptionalFavorites() {
  return useContext(FavoritesContext);
}

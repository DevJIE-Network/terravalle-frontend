import { createContext } from 'react';

/**
 * Contexto de favoritos del usuario autenticado. No lo consumas directamente:
 * usa el hook useFavorites() de '@/hooks'.
 */
export const FavoritesContext = createContext(null);

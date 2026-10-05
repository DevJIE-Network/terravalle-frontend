import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

/**
 * Acceso a la sesión actual desde cualquier componente.
 * @example const { user, isAuthenticated, login, logout } = useAuth();
 * @returns {{
 *   user: { id: number, name: string, email: string } | null,
 *   token: string | null,
 *   isAuthenticated: boolean,
 *   login: (credentials: { email: string, password: string }) => Promise<object>,
 *   logout: () => void,
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth() debe usarse dentro de <AuthProvider>.');
  }
  return context;
}

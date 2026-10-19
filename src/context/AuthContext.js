import { createContext } from 'react';

/**
 * Contexto de autenticación. No lo consumas directamente:
 * usa el hook useAuth() de '@/hooks'.
 *
 * Valor expuesto: { user, token, isAuthenticated, sessionExpired, login, logout,
 * updateUser, expireSession, clearSessionNotice }
 */
export const AuthContext = createContext(null);

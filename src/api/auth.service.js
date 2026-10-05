import client from './client';

/**
 * Servicio de autenticación (módulo /auth del backend).
 *
 * Plantilla para el resto de servicios: crea un archivo <modulo>.service.js
 * (ej. properties.service.js) con funciones async que usen `client` y
 * devuelvan solo `data`. Las páginas llaman a estas funciones, no a axios.
 *
 * ⚠ Todavía NO se usan: el backend aún no publica estos endpoints y el
 * login de AuthProvider es simulado. Ajusta rutas y campos cuando el
 * equipo de backend confirme el contrato.
 */

/**
 * Registra una cuenta nueva.
 * TODO HU-017: confirmar contrato de POST /auth/register y usarlo en RegisterPage.
 * @param {{ name: string, email: string, password: string }} payload
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function register(payload) {
  const { data } = await client.post('/auth/register', payload);
  return data;
}

/**
 * Inicia sesión con correo y contraseña.
 * TODO HU-018: confirmar contrato de POST /auth/login y usarlo en AuthProvider.login().
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function login(credentials) {
  const { data } = await client.post('/auth/login', credentials);
  return data;
}

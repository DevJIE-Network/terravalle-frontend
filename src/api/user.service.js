import client from './client';

/**
 * Servicio de usuarios (módulo /users del backend, HU-003).
 * Cada usuario solo puede consultar y editar su propio perfil: por eso se usa siempre `/users/me`.
 */

/**
 * Perfil del usuario autenticado.
 * @returns {Promise<{ id: string, name: string, email: string, phone: string|null,
 *   contactEmail: string|null, createdAt: string|null }>}
 */
export async function getMyProfile() {
  const { data } = await client.get('/users/me');
  return data.user;
}

/**
 * Actualiza los campos permitidos del perfil. Envía solo los campos que cambiaron.
 * Un campo opcional enviado como '' se borra en el backend.
 * @param {{ name?: string, email?: string, phone?: string, contactEmail?: string }} changes
 * @returns {Promise<{ message: string, user: object }>}
 * @throws {Error} con `status` y `details` (errores de validación o correo duplicado)
 */
export async function updateMyProfile(changes) {
  const { data } = await client.patch('/users/me', changes);
  return data;
}

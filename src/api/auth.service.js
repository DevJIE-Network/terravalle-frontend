import client from './client';

/**
 * Servicio de autenticación (módulo /auth del backend).
 *
 * Plantilla para el resto de servicios: crea un archivo <modulo>.service.js
 * (ej. properties.service.js) con funciones async que usen `client` y
 * devuelvan solo `data`. Las páginas llaman a estas funciones, no a axios.
 *
 * Contrato esperado (HU-002): POST /auth/login → { user, token }.
 * Si el backend usa otros nombres de campo, ajústalos solo en este archivo.
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

/** Mensaje único para cualquier fallo de credenciales (no revela si el correo existe). */
export const INVALID_CREDENTIALS_MESSAGE = 'Correo o contraseña no válidos.';

// Respuestas del backend que se tratan como "credenciales no válidas".
const CREDENTIAL_ERROR_STATUSES = [400, 401, 403, 404, 422];

/**
 * Inicia sesión con correo y contraseña (HU-018 / HU-002).
 * Cualquier rechazo por credenciales se convierte en un mensaje genérico; los errores de red o
 * de servidor conservan el mensaje del cliente HTTP.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ user: object, token: string }>}
 * @throws {Error} con `message` listo para mostrar al usuario
 */
export async function login({ email, password }) {
  try {
    const { data } = await client.post('/auth/login', { email, password }, { skipAuth: true });

    const token = data?.token ?? data?.accessToken;
    if (!token) {
      throw new Error('Respuesta de inicio de sesión inválida.');
    }

    return { user: data.user ?? { email }, token };
  } catch (error) {
    if (CREDENTIAL_ERROR_STATUSES.includes(error.status)) {
      const genericError = new Error(INVALID_CREDENTIALS_MESSAGE);
      genericError.status = error.status;
      throw genericError;
    }
    throw error;
  }
}

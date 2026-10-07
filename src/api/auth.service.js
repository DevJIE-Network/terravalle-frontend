import client from './client';

/** Registra una cuenta nueva. */
export async function register(payload) {
  const { data } = await client.post('/auth/register', payload);
  return data;
}

/** Inicia sesión con correo y contraseña. */
export async function login(credentials) {
  const { data } = await client.post('/auth/login', credentials);
  return data;
}

/** Obtiene el usuario asociado al token actual. */
export async function me() {
  const { data } = await client.get('/auth/me');
  return data;
}

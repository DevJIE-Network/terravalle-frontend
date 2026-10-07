import axios from 'axios';
import { API_URL, STORAGE_KEYS } from '@/utils/constants';

/**
 * Cliente HTTP compartido para hablar con terravalle-backend.
 *
 * Úsalo SIEMPRE desde un archivo de servicio (src/api/*.service.js), nunca
 * directamente con axios en una página. Ejemplo:
 *
 *   const { data } = await client.get('/properties');
 *
 * Si la petición falla, el error que recibes en el catch ya trae:
 *   - error.message → texto en español listo para mostrar al usuario
 *   - error.status  → código HTTP (o null si no hubo respuesta)
 *   - error.details → cuerpo de la respuesta del backend (para depurar / validaciones)
 */
const client = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/* ------------------------------------------------------------------ */
/* Petición: adjunta el token JWT si hay sesión guardada               */
/* ------------------------------------------------------------------ */
client.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ------------------------------------------------------------------ */
/* Respuesta: traduce errores técnicos a mensajes entendibles          */
/* ------------------------------------------------------------------ */
const ERROR_MESSAGES = {
  network: 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.',
  timeout: 'El servidor tardó demasiado en responder. Intenta de nuevo en unos momentos.',
  400: 'Los datos enviados no son válidos. Revisa la información e intenta de nuevo.',
  401: 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No encontramos lo que buscabas.',
  500: 'Ocurrió un problema en el servidor. Intenta de nuevo más tarde.',
  default: 'Ocurrió un error inesperado. Intenta de nuevo.',
};

// Función que se ejecuta al recibir un 401. El AuthProvider la registra para cerrar sesión.
let onUnauthorized = null;

/**
 * Registra qué hacer cuando el backend responde 401 (sesión inválida).
 * Lo usa AuthProvider; normalmente no necesitas llamarlo tú.
 * @param {(() => void) | null} handler
 */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? null;
    let message;

    if (error.code === 'ECONNABORTED') {
      message = ERROR_MESSAGES.timeout;
    } else if (!error.response) {
      message = ERROR_MESSAGES.network;
    } else if (status >= 500) {
      message = ERROR_MESSAGES[500];
    } else {
      message = ERROR_MESSAGES[status] ?? ERROR_MESSAGES.default;
    }

    if (status === 401 && getStoredToken() && onUnauthorized) {
      onUnauthorized();
    }

    if (status === 401 && error.response?.data?.message) {
      message = error.response.data.message;
    }

    const friendlyError = new Error(message);
    friendlyError.status = status;
    friendlyError.details = error.response?.data ?? null;
    return Promise.reject(friendlyError);
  },
);

function getStoredToken() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION));
    return session?.token ?? null;
  } catch {
    return null;
  }
}

export default client;

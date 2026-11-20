// Centraliza las peticiones al backend para no tener que escribir la dirección IP
// y las solicitudes HTTP en cada pantalla.
import { auth } from '../../config/firebase';

// Dirección del backend: se define en mobile/.env (EXPO_PUBLIC_API_URL, ver .env.example).
// Usa la IP de tu computador en la red local, no "localhost" (el celular no la ve).
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

if (!API_BASE_URL) {
  console.warn(
    '[api] Falta EXPO_PUBLIC_API_URL. Copia mobile/.env.example como mobile/.env y reinicia Expo.'
  );
}

// Opciones adicionales para las peticiones
type ApiRequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: HeadersInit;
  token?: string;
};

// Error de la API con el código HTTP (p. ej. 429 = "espera un minuto").
// Es un Error normal: las pantallas que solo leen `message` siguen funcionando igual.
export class ApiError extends Error {
  readonly status: number;
  readonly details: string[];

  constructor(message: string, status: number, details: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const isApiError = (error: unknown, status?: number): error is ApiError =>
  error instanceof ApiError && (status === undefined || error.status === status);

// Formato de error del backend: { error, details? }
const buildErrorMessage = (data: any): string => {
  const base = data?.error || data?.message || 'Error al conectar con el servidor';
  return Array.isArray(data?.details) && data.details.length > 0
    ? `${base}: ${data.details.join('. ')}`
    : base;
};

const send = async (
  endpoint: string,
  options: Omit<ApiRequestOptions, 'token'>,
  token: string | null
): Promise<Response> => {
  const { headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);

  requestHeaders.set('Content-Type', 'application/json');

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  try {
    return await fetch(`${API_BASE_URL}${endpoint}`, {
      ...requestOptions,
      headers: requestHeaders,
    });
  } catch {
    throw new Error(
      `No se pudo conectar con el servidor (${API_BASE_URL}). Revisa que el backend esté encendido y la IP en mobile/.env.`
    );
  }
};

// Comunicarse con el backend.
// Si no se pasa `token`, se usa el de la sesión de Firebase automáticamente.
// Si el backend responde 401 (token vencido), se pide uno nuevo y se reintenta una vez.
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { token: explicitToken, ...requestOptions } = options;

  const user = auth.currentUser;
  const token = explicitToken ?? (user ? await user.getIdToken() : null);

  let response = await send(endpoint, requestOptions, token);

  if (response.status === 401 && user) {
    const freshToken = await user.getIdToken(true);
    response = await send(endpoint, requestOptions, freshToken);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      buildErrorMessage(data),
      response.status,
      Array.isArray(data?.details) ? data.details : []
    );
  }

  return data as T;
}

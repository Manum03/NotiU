//centraliza las peticiones al backend para no tener que escribir la dirección IP y las solicitudes HTTP en cada pantalla
const API_BASE_URL = 'http://192.168.2.11:3000/api';

// adicionales para las peticiones
type ApiRequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: HeadersInit;
  token?: string;
};

// comunicarse con el backend
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { token, headers, ...requestOptions } = options;

  const requestHeaders = new Headers(headers);

  requestHeaders.set('Content-Type', 'application/json');

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...requestOptions,
    headers: requestHeaders,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error || data?.message || 'Error al conectar con el servidor'
    );
  }

  return data as T;
}

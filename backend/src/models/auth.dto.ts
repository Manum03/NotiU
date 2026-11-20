// Registro, login, cambio de contraseña y cierre de sesión ahora los maneja
// Firebase Authentication directamente desde la app móvil.

export interface MessageResponseDto {
  message: string;
}

export interface ErrorResponseDto {
  error: string;
  details?: string[];
}

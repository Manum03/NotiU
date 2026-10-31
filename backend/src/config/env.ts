export const config = {
  port: Number(process.env.PORT) || 3000,
  // Duración de la sesión (token) en milisegundos: 1 hora
  sessionTtlMs: 60 * 60 * 1000,
};

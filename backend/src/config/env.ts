import "dotenv/config";

const toList = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const toInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

export const isProduction = process.env.NODE_ENV === "production";

export const config = {
  port: toInt(process.env.PORT, 3000),

  // Zona horaria con la que se muestran fechas en los textos de las notificaciones
  timezone: process.env.APP_TIMEZONE || "America/Bogota",

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "demo-notiu",
    // Contenido del JSON de la cuenta de servicio (texto plano o base64).
    // Alternativa: GOOGLE_APPLICATION_CREDENTIALS con la ruta al archivo.
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    usingEmulators: Boolean(process.env.FIRESTORE_EMULATOR_HOST),
  },

  // Correos que reciben el rol admin automáticamente al iniciar sesión
  adminEmails: toList(process.env.ADMIN_EMAILS).map((e) => e.toLowerCase()),

  // Llave de 32 bytes en base64 para cifrar secretos (URL iCal, refresh tokens)
  encryptionKey: process.env.ENCRYPTION_KEY,

  google: {
    // Client ID de tipo "Aplicación web" del mismo proyecto de Google Cloud / Firebase
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    // Para el serverAuthCode de Google Sign-In en móvil se usa redirect vacío
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "",
  },

  expo: {
    // Opcional: solo si activas "Enhanced Security for Push Notifications" en Expo
    accessToken: process.env.EXPO_ACCESS_TOKEN,
  },

  jobs: {
    enabled: process.env.JOBS_ENABLED !== "false",
    syncIntervalMinutes: toInt(process.env.SYNC_INTERVAL_MINUTES, 30),
    reminderCheckSeconds: toInt(process.env.REMINDER_CHECK_SECONDS, 60),
  },

  // Recordatorios por defecto: 24 h y 2 h antes de la fecha de entrega
  defaultReminderOffsetsMinutes: [1440, 120],
};

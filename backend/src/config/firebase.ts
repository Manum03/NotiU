import { App, applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { config } from "./env";

// Inicializa Firebase Admin una sola vez.
// Orden de prioridad de credenciales:
//   1. FIREBASE_SERVICE_ACCOUNT_JSON (JSON en texto o base64) -> ideal para Render/Railway
//   2. GOOGLE_APPLICATION_CREDENTIALS (ruta al .json)          -> ideal en local
//   3. Emuladores (FIRESTORE_EMULATOR_HOST)                    -> desarrollo sin credenciales
const parseServiceAccount = (raw: string): Record<string, string> => {
  const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(text) as Record<string, string>;
};

const createApp = (): App => {
  const existing = getApps()[0];
  if (existing) return existing;

  if (config.firebase.serviceAccountJson) {
    const sa = parseServiceAccount(config.firebase.serviceAccountJson);
    return initializeApp({ credential: cert(sa), projectId: sa.project_id });
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({ credential: applicationDefault(), projectId: config.firebase.projectId });
  }
  if (config.firebase.usingEmulators) {
    return initializeApp({ projectId: config.firebase.projectId });
  }
  throw new Error(
    "Firebase no está configurado. Define FIREBASE_SERVICE_ACCOUNT_JSON o " +
      "GOOGLE_APPLICATION_CREDENTIALS, o usa los emuladores (FIRESTORE_EMULATOR_HOST). Revisa .env.example",
  );
};

const app = createApp();

export const db: Firestore = getFirestore(app);
// Evita errores al guardar objetos con campos opcionales en undefined
db.settings({ ignoreUndefinedProperties: true });

export const firebaseAuth: Auth = getAuth(app);

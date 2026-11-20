import { NotificationSource } from "./notification.model";
import { TaskSource } from "./task.model";

export const INTEGRATION_PROVIDERS = ["moodle", "classroom"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

// active: sincroniza normal · error: falló la última vez (se reintenta) ·
// needs_reauth: el usuario debe volver a conectar (token revocado, URL inválida)
export type IntegrationStatus = "active" | "error" | "needs_reauth";

export const PROVIDER_SOURCE: Record<IntegrationProvider, TaskSource> = {
  moodle: "MOODLE",
  classroom: "CLASSROOM",
};

// Origen con el que se etiquetan las notificaciones de cada integración
export const PROVIDER_NOTIFICATION_SOURCE: Record<IntegrationProvider, NotificationSource> = {
  moodle: "MOODLE",
  classroom: "CLASSROOM",
};

export const PROVIDER_LABEL: Record<IntegrationProvider, string> = {
  moodle: "Moodle",
  classroom: "Google Classroom",
};

export interface SyncStats {
  total: number;
  created: number;
  updated: number;
  notified: number;
}

// Documento `integrations/{userId}_{provider}`
export interface Integration {
  id: string;
  userId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  secret: string; // CIFRADO: URL privada iCal (Moodle) o refresh token (Classroom)
  displayName: string; // host de Moodle o correo de Google, para mostrar en la app
  lastSyncAt: Date | null;
  lastSuccessAt: Date | null;
  lastError: string | null;
  lastStats: SyncStats | null;
  createdAt: Date;
  updatedAt: Date;
}

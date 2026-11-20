export type NotificationCategory = "URGENT" | "INFORMATIVE";
export type NotificationSource = "MOODLE" | "CLASSROOM" | "SYSTEM";

// Qué originó la notificación (la app puede usarlo para escoger icono o pantalla)
export type NotificationKind = "NEW_TASK" | "DUE_DATE_CHANGED" | "REMINDER" | "SYNC_SUMMARY" | "SYSTEM";

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = ["URGENT", "INFORMATIVE"];

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  category: NotificationCategory;
  source: NotificationSource;
  kind: NotificationKind;
  taskId: string | null;
  externalId: string | null;
  payload: Record<string, unknown> | null;
  sourcePublishedAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
}

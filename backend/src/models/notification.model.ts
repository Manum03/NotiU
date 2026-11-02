export type NotificationCategory = "URGENT" | "INFORMATIVE";
export type NotificationSource = "MOODLE" | "CLASSROOM" | "SYSTEM";

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = ["URGENT", "INFORMATIVE"];

export interface Notification {
  id: string;
  userId: number;
  title: string;
  body: string;
  category: NotificationCategory;
  source: NotificationSource;
  externalId: string | null;
  payload: Record<string, unknown> | null;
  sourcePublishedAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
}
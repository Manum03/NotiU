// Notificaciones guardadas (GET /notifications)
export type NotificationKind =
  | 'NEW_TASK'
  | 'DUE_DATE_CHANGED'
  | 'REMINDER'
  | 'SYNC_SUMMARY'
  | 'SYSTEM';

export type NotificationDto = {
  id: string;
  title: string;
  body: string;
  category: 'URGENT' | 'INFORMATIVE';
  source: 'MOODLE' | 'CLASSROOM' | 'SYSTEM';
  kind: NotificationKind;
  taskId: string | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationsResponse = {
  data: NotificationDto[];
  meta: { page: number; limit: number; total: number; totalPages: number; unreadCount: number };
};

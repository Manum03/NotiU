import { NotificationCategory, NotificationKind, NotificationSource } from "./notification.model";

export interface ListNotificationsQueryDto {
  category?: NotificationCategory;
  read?: boolean;
  page: number;
  limit: number;
}

export interface NotificationDto {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  source: NotificationSource;
  kind: NotificationKind;
  taskId: string | null;
  payload: Record<string, unknown> | null;
  sourcePublishedAt: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface ListNotificationsResponseDto {
  data: NotificationDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    unreadCount: number;
  };
}

export interface MarkReadResponseDto {
  message: string;
  updated: number;
}

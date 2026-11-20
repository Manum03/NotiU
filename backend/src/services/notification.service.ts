import { db } from "../config/firebase";
import {
  ListNotificationsQueryDto,
  ListNotificationsResponseDto,
  MarkReadResponseDto,
  NotificationDto,
} from "../models/notification.dto";
import { Notification } from "../models/notification.model";
import { HttpError } from "../utils/http-error";
import { chunk, iso, toDate, toDateOrNow } from "../utils/firestore";
import { pushService } from "./notifications/push.service";
import { settingsService } from "./settings.service";

// Notificaciones en Firestore: `users/{uid}/notifications/{id}`
const col = (userId: string) => db.collection("users").doc(userId).collection("notifications");

// Para listar se leen las más recientes y se filtra en memoria: evita índices compuestos.
const MAX_SCAN = 300;

export type NewNotification = Pick<Notification, "title" | "body" | "category" | "source" | "kind"> &
  Partial<Pick<Notification, "taskId" | "externalId" | "payload" | "sourcePublishedAt">>;

const fromDoc = (userId: string, id: string, d: FirebaseFirestore.DocumentData): Notification => ({
  id,
  userId,
  title: String(d.title ?? ""),
  body: String(d.body ?? ""),
  category: d.category ?? "INFORMATIVE",
  source: d.source ?? "SYSTEM",
  kind: d.kind ?? "SYSTEM",
  taskId: d.taskId ?? null,
  externalId: d.externalId ?? null,
  payload: d.payload ?? null,
  sourcePublishedAt: toDate(d.sourcePublishedAt),
  readAt: toDate(d.readAt),
  createdAt: toDateOrNow(d.createdAt),
});

const toDto = (n: Notification): NotificationDto => ({
  id: n.id,
  title: n.title,
  body: n.body,
  category: n.category,
  source: n.source,
  kind: n.kind,
  taskId: n.taskId,
  payload: n.payload,
  sourcePublishedAt: iso(n.sourcePublishedAt),
  isRead: n.readAt !== null,
  readAt: iso(n.readAt),
  createdAt: n.createdAt.toISOString(),
});

export const notificationService = {
  async create(userId: string, data: NewNotification): Promise<Notification> {
    const ref = col(userId).doc();
    const notification: Notification = {
      id: ref.id,
      userId,
      taskId: null,
      externalId: null,
      payload: null,
      sourcePublishedAt: null,
      readAt: null,
      createdAt: new Date(),
      ...data,
    };
    const { id: _id, ...stored } = notification;
    await ref.set(stored);
    return notification;
  },

  // Guarda la notificación y, si el usuario tiene push activado, la envía al celular
  async notifyUser(userId: string, data: NewNotification): Promise<Notification> {
    const notification = await notificationService.create(userId, data);
    const settings = await settingsService.getSettings(userId);
    if (settings.notifications.push) {
      await pushService.sendToUser(userId, {
        title: notification.title,
        body: notification.body,
        data: { notificationId: notification.id, taskId: notification.taskId, kind: notification.kind },
      });
    }
    return notification;
  },

  async list(userId: string, query: ListNotificationsQueryDto): Promise<ListNotificationsResponseDto> {
    const [snap, unread] = await Promise.all([
      col(userId).orderBy("createdAt", "desc").limit(MAX_SCAN).get(),
      col(userId).where("readAt", "==", null).count().get(),
    ]);

    const filtered = snap.docs
      .map((d) => fromDoc(userId, d.id, d.data()))
      .filter((n) => query.category === undefined || n.category === query.category)
      .filter((n) => query.read === undefined || (n.readAt !== null) === query.read);

    const total = filtered.length;
    const start = (query.page - 1) * query.limit;
    return {
      data: filtered.slice(start, start + query.limit).map(toDto),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        unreadCount: unread.data().count,
      },
    };
  },

  async markRead(userId: string, notificationId: string): Promise<NotificationDto> {
    const ref = col(userId).doc(notificationId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, "Notificación no encontrada");
    const n = fromDoc(userId, snap.id, snap.data() ?? {});
    if (!n.readAt) {
      n.readAt = new Date();
      await ref.update({ readAt: n.readAt });
    }
    return toDto(n);
  },

  async markAllRead(userId: string): Promise<MarkReadResponseDto> {
    const snap = await col(userId).where("readAt", "==", null).get();
    const now = new Date();
    for (const group of chunk(snap.docs, 400)) {
      const batch = db.batch();
      group.forEach((d) => batch.update(d.ref, { readAt: now }));
      await batch.commit();
    }
    return { message: "Notificaciones marcadas como leídas", updated: snap.size };
  },
};

import { randomUUID } from "node:crypto";
import {
  ListNotificationsQueryDto,
  ListNotificationsResponseDto,
  NotificationDto,
} from "../models/notification.dto";
import { Notification } from "../models/notification.model";

const notifications: Notification[] = [];

type NewNotification = Pick<Notification, "userId" | "title" | "body" | "category" | "source"> &
  Partial<Pick<Notification, "externalId" | "payload" | "sourcePublishedAt" | "readAt" | "createdAt">>;

const create = (data: NewNotification): Notification => {
  const notification: Notification = {
    id: randomUUID(),
    externalId: null,
    payload: null,
    sourcePublishedAt: null,
    readAt: null,
    createdAt: new Date(),
    ...data,
  };
  notifications.push(notification);
  return notification;
};

const toDto = (n: Notification): NotificationDto => ({
  id: n.id,
  title: n.title,
  body: n.body,
  category: n.category,
  source: n.source,
  payload: n.payload,
  sourcePublishedAt: n.sourcePublishedAt?.toISOString() ?? null,
  isRead: n.readAt !== null,
  readAt: n.readAt?.toISOString() ?? null,
  createdAt: n.createdAt.toISOString(),
});

export const notificationService = {
  create,

  list(userId: number, query: ListNotificationsQueryDto): ListNotificationsResponseDto {
    const mine = notifications.filter((n) => n.userId === userId);

    const filtered = mine
      .filter((n) => query.category === undefined || n.category === query.category)
      .filter((n) => query.read === undefined || (n.readAt !== null) === query.read)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = filtered.length;
    const start = (query.page - 1) * query.limit;

    return {
      data: filtered.slice(start, start + query.limit).map(toDto),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        unreadCount: mine.filter((n) => n.readAt === null).length,
      },
    };
  },
};

// ---- Datos de prueba para admin@notiu.com (id 1). Temporal. ----
const minutesAgo = (m: number): Date => new Date(Date.now() - m * 60_000);

const seed = (
  title: string,
  body: string,
  category: Notification["category"],
  source: Notification["source"],
  agoMin: number,
  read = false,
  payload: Notification["payload"] = null,
): void => {
  create({
    userId: 1,
    title,
    body,
    category,
    source,
    payload,
    createdAt: minutesAgo(agoMin),
    sourcePublishedAt: minutesAgo(agoMin + 2),
    readAt: read ? minutesAgo(agoMin - 1) : null,
  });
};

seed("Clase cancelada", "Se cancela la clase de hoy.", "URGENT", "MOODLE", 5, false, {
  materia: "Construcción de Software",
  hora: "14:00",
  nuevoEstado: "cancelada",
});
seed("Cambio de salón", "La clase pasa al salón B-204.", "URGENT", "CLASSROOM", 40, false, {
  materia: "Bases de Datos",
  hora: "10:00",
  nuevoEstado: "salón B-204",
});
seed("Parcial reprogramado", "El parcial 2 se mueve al viernes.", "URGENT", "MOODLE", 120, true);
seed("Nueva tarea publicada", "Entrega del taller 3.", "INFORMATIVE", "CLASSROOM", 300);
seed("Charla de emprendimiento", "Auditorio principal, 4 p. m.", "INFORMATIVE", "MOODLE", 600);
seed("Feria de empleo", "Inscripciones abiertas.", "INFORMATIVE", "MOODLE", 1500, true);
seed("Recordatorio de entrega", "Taller 2 vence mañana.", "INFORMATIVE", "SYSTEM", 2000);
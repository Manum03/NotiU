import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import {
  ListNotificationsResponseDto,
  MarkReadResponseDto,
  NotificationDto,
} from "../models/notification.dto";
import { notificationService } from "../services/notification.service";
import { pushService } from "../services/notifications/push.service";
import { validateListNotificationsQuery, validateNotificationId } from "../utils/notification.validators";

export const notificationsController = {
  async list(req: Request, res: Response<ListNotificationsResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const query = validateListNotificationsQuery(req.query);
    res.status(200).json(await notificationService.list(session.userId, query));
  },

  async markRead(req: Request, res: Response<NotificationDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const id = validateNotificationId(req.params.notificationId);
    res.status(200).json(await notificationService.markRead(session.userId, id));
  },

  async markAllRead(_req: Request, res: Response<MarkReadResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    res.status(200).json(await notificationService.markAllRead(session.userId));
  },

  // Envía un push de prueba a los dispositivos del usuario (no se guarda en el historial)
  async test(_req: Request, res: Response): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const delivered = await pushService.sendToUser(session.userId, {
      title: "🦊 NotiU funciona",
      body: "Así te avisaremos de tus tareas nuevas y recordatorios.",
      data: { kind: "SYSTEM" },
    });
    res.status(200).json({ message: "Push de prueba enviado", devices: delivered });
  },
};

import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import { ListNotificationsResponseDto } from "../models/notification.dto";
import { notificationService } from "../services/notification.service";
import { validateListNotificationsQuery } from "../utils/notification.validators";

export const notificationsController = {
  list(req: Request, res: Response<ListNotificationsResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const query = validateListNotificationsQuery(req.query);
    res.status(200).json(notificationService.list(session.userId, query));
  },
};
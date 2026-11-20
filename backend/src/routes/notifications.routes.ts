import { Router } from "express";
import { notificationsController } from "../controllers/notifications.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/", notificationsController.list);
notificationsRouter.post("/read-all", notificationsController.markAllRead);
notificationsRouter.post("/test", notificationsController.test);
notificationsRouter.patch("/:notificationId/read", notificationsController.markRead);

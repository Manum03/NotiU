import { Router } from "express";
import { notificationsController } from "../controllers/notifications.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, notificationsController.list);
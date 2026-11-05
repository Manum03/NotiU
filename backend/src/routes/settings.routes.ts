import { Router } from "express";
import { settingsController } from "../controllers/settings.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get("/", settingsController.get);
settingsRouter.patch("/", settingsController.update);
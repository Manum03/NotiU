import { Router } from "express";
import { profileController } from "../controllers/profile.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get("/", profileController.get);
profileRouter.patch("/", profileController.update);

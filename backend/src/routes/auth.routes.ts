import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

export const authRouter = Router();

authRouter.get("/me", requireAuth, authController.me);
authRouter.get("/users", requireAuth, requireRole("admin"), authController.listUsers);

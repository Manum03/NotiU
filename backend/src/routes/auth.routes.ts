import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

export const authRouter = Router();

authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
authRouter.post("/logout", requireAuth, authController.logout);
authRouter.get("/me", requireAuth, authController.me);
authRouter.patch("/password", requireAuth, authController.changePassword);
authRouter.get("/users", requireAuth, requireRole("admin"), authController.listUsers);

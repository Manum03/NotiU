import { Router } from "express";
import { connectionController } from "../controllers/connection.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const peersRouter = Router();

peersRouter.use(requireAuth);

peersRouter.get("/", connectionController.listPeers);

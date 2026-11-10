import { Router } from "express";
import { connectionController } from "../controllers/connection.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const connectionsRouter = Router();

connectionsRouter.use(requireAuth);

connectionsRouter.get("/", connectionController.list);

connectionsRouter.post("/requests", connectionController.createRequest);

connectionsRouter.patch("/requests/:requestId", connectionController.respondRequest);

connectionsRouter.delete("/:connectionId", connectionController.remove);

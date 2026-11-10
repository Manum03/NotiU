import { Router } from "express";
import { studyGroupController } from "../controllers/study-group.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const studyGroupsRouter = Router();

studyGroupsRouter.use(requireAuth);

studyGroupsRouter.get("/", studyGroupController.list);

studyGroupsRouter.get("/:groupId", studyGroupController.get);

studyGroupsRouter.post("/", studyGroupController.create);

studyGroupsRouter.post("/:groupId/join", studyGroupController.join);

studyGroupsRouter.delete("/:groupId/leave", studyGroupController.leave);

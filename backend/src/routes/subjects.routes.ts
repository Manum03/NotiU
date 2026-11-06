import { Router } from "express";
import { gradeController } from "../controllers/grade.controller";
import { subjectController } from "../controllers/subject.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const subjectsRouter = Router();

subjectsRouter.use(requireAuth);

subjectsRouter.post("/", subjectController.create);

subjectsRouter.get("/", subjectController.list);

subjectsRouter.get("/:subjectId", subjectController.get);

subjectsRouter.patch("/:subjectId", subjectController.update);

subjectsRouter.get("/:subjectId/schedule", subjectController.getSchedule);

subjectsRouter.post("/:subjectId/grades", gradeController.create);

subjectsRouter.get("/:subjectId/grades", gradeController.listBySubject);

subjectsRouter.get("/:subjectId/progress", gradeController.getProgress);
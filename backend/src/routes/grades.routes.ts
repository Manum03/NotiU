import { Router } from "express";
import { gradeController } from "../controllers/grade.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const gradesRouter = Router();

gradesRouter.use(requireAuth);

gradesRouter.get("/", gradeController.list);

// /average va ANTES que /:gradeId: si no, Express interpretaría "average" como un ID
gradesRouter.get("/average", gradeController.average);

gradesRouter.patch("/:gradeId", gradeController.update);

gradesRouter.delete("/:gradeId", gradeController.remove);
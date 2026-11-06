import { Router } from "express";
import { gradeController } from "../controllers/grade.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const gradesRouter = Router();

gradesRouter.use(requireAuth);

gradesRouter.get("/", gradeController.list);
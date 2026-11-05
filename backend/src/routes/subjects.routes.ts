import { Router } from "express";
import { subjectController } from "../controllers/subject.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const subjectsRouter = Router();

subjectsRouter.use(requireAuth);

subjectsRouter.post("/", subjectController.create);
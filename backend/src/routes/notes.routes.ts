import { Router } from "express";
import { noteController } from "../controllers/note.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const notesRouter = Router();

notesRouter.use(requireAuth);

notesRouter.get("/", noteController.list);

notesRouter.post("/", noteController.create);

notesRouter.patch("/:noteId", noteController.update);

notesRouter.delete("/:noteId", noteController.remove);

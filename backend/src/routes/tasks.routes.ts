import { Router } from "express";
import { taskController } from "../controllers/task.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const tasksRouter = Router();

// Todas las rutas requieren autenticación
tasksRouter.use(requireAuth);

// Crear una tarea
tasksRouter.post("/", taskController.create);

// Consultar todas las tareas
tasksRouter.get("/", taskController.list);

// Consultar una tarea específica
tasksRouter.get("/:taskId", taskController.get);

// Actualizar una tarea
tasksRouter.patch("/:taskId", taskController.update);

// Marcar una tarea como realizada
tasksRouter.patch("/:taskId/complete", taskController.complete);

// Archivar y restaurar una tarea
tasksRouter.patch("/:taskId/archive", taskController.archive);
tasksRouter.patch("/:taskId/restore", taskController.restore);

// Eliminar una tarea
tasksRouter.delete("/:taskId", taskController.remove);

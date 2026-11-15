
import { Router } from "express";

import { requireAuth } from "../middlewares/auth.middleware";

import {
  createTaskController,
  listTasksController,
  getTaskByIdController,
  updateTaskController,
  deleteTaskController,
  completeTaskController,
} from "../controllers/task.controller";

export const tasksRouter = Router();

// Todas las rutas requieren autenticación
tasksRouter.use(requireAuth);

// Crear una tarea
tasksRouter.post("/", createTaskController);

// Consultar todas las tareas
tasksRouter.get("/", listTasksController);

// Consultar una tarea específica
tasksRouter.get("/:taskId", getTaskByIdController);

// Actualizar una tarea
tasksRouter.patch("/:taskId", updateTaskController);

// Marcar una tarea como realizada
tasksRouter.patch("/:taskId/complete", completeTaskController);

// Eliminar una tarea
tasksRouter.delete("/:taskId", deleteTaskController);

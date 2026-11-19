// Controla las solicitudes HTTP del modulo de tareas
// Recibe los datos, identifica al usuario, llama al servicio correspondiente y devuelve respuestas
import { Request, Response, NextFunction } from "express";

import {
  createTask,
  listTasks,
  getTaskById,
  updateTask,
  deleteTask,
  completeTask,
} from "../services/task.service";

import {
  CreateTaskDto,
  TaskListQueryDto,
  UpdateTaskDto,
} from "../models/task.dto";

function getUserId(res: Response): number {
  const session = res.locals.session;

  if (!session || typeof session.userId !== "number") {
    throw new Error("No se encontró la sesión del usuario");
  }

  return session.userId;
}

function getTaskId(req: Request): string {
  const taskId = req.params.taskId;

  if (typeof taskId !== "string" || !taskId.trim()) {
    throw new Error("Identificador de tarea inválido");
  }

  return taskId;
}

export function createTaskController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = getUserId(res);
    const data = req.body as CreateTaskDto;

    const task = createTask(userId, data);

    res.status(201).json({
      message: "Tarea creada correctamente",
      task,
    });
  } catch (error) {
    next(error);
  }
}

export function listTasksController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = getUserId(res);
    const filters = req.query as TaskListQueryDto;

    const result = listTasks(userId, filters);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export function getTaskByIdController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = getUserId(res);
    const task = getTaskById(userId, getTaskId(req));

    res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
}

export function updateTaskController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = getUserId(res);
    const data = req.body as UpdateTaskDto;

    const task = updateTask(userId, getTaskId(req), data);

    res.status(200).json({
      message: "Tarea actualizada correctamente",
      task,
    });
  } catch (error) {
    next(error);
  }
}

export function deleteTaskController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = getUserId(res);

    deleteTask(userId, getTaskId(req));

    res.status(200).json({
      message: "Tarea eliminada correctamente",
    });
  } catch (error) {
    next(error);
  }
}

export function completeTaskController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = getUserId(res);

    const task = completeTask(userId, getTaskId(req));

    res.status(200).json({
      message: "Tarea marcada como realizada",
      task,
    });
  } catch (error) {
    next(error);
  }
}

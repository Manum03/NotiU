// Controla las solicitudes HTTP del modulo de tareas
// Recibe los datos, identifica al usuario, llama al servicio correspondiente y devuelve respuestas
import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import { MessageResponseDto } from "../models/auth.dto";
import { TaskListResponseDto, TaskResponseDto } from "../models/task.dto";
import { taskService } from "../services/task.service";
import {
  validateCreateTask,
  validateListTasksQuery,
  validateTaskId,
  validateUpdateTask,
} from "../utils/task.validators";

type TaskMessageResponse = { message: string; task: TaskResponseDto };

export const taskController = {
  // Crear una tarea
  async create(req: Request, res: Response<TaskMessageResponse>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const dto = validateCreateTask(req.body);
    const task = await taskService.createTask(session.userId, dto);
    res.status(201).json({ message: "Tarea creada correctamente", task });
  },

  // Consultar todas las tareas (manuales e importadas de Moodle/Classroom)
  async list(req: Request, res: Response<TaskListResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const filters = validateListTasksQuery(req.query);
    res.status(200).json(await taskService.listTasks(session.userId, filters));
  },

  // Consultar una tarea específica
  async get(req: Request, res: Response<{ task: TaskResponseDto }>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const taskId = validateTaskId(req.params.taskId);
    res.status(200).json({ task: await taskService.getTaskById(session.userId, taskId) });
  },

  // Actualizar una tarea
  async update(req: Request, res: Response<TaskMessageResponse>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const taskId = validateTaskId(req.params.taskId);
    const dto = validateUpdateTask(req.body);
    const task = await taskService.updateTask(session.userId, taskId, dto);
    res.status(200).json({ message: "Tarea actualizada correctamente", task });
  },

  // Marcar una tarea como realizada
  async complete(req: Request, res: Response<TaskMessageResponse>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const taskId = validateTaskId(req.params.taskId);
    const task = await taskService.completeTask(session.userId, taskId);
    res.status(200).json({ message: "Tarea marcada como realizada", task });
  },

  // Archivar una tarea
  async archive(req: Request, res: Response<TaskMessageResponse>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const taskId = validateTaskId(req.params.taskId);
    const task = await taskService.archiveTask(session.userId, taskId);
    res.status(200).json({ message: "Tarea archivada", task });
  },

  // Restaurar una tarea archivada
  async restore(req: Request, res: Response<TaskMessageResponse>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const taskId = validateTaskId(req.params.taskId);
    const task = await taskService.restoreTask(session.userId, taskId);
    res.status(200).json({ message: "Tarea restaurada", task });
  },

  // Eliminar una tarea (solo las creadas en NotiU)
  async remove(req: Request, res: Response<MessageResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const taskId = validateTaskId(req.params.taskId);
    await taskService.deleteTask(session.userId, taskId);
    res.status(200).json({ message: "Tarea eliminada correctamente" });
  },
};

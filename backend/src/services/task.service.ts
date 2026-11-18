
import { randomUUID } from "crypto";

import { Task } from "../models/task.model";

import {
  CreateTaskDto,
  TaskListQueryDto,
  TaskResponseDto,
  UpdateTaskDto,
} from "../models/task.dto";

import { HttpError } from "../utils/http-error";

const tasks: Task[] = [];

function toTaskResponse(task: Task): TaskResponseDto {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    type: task.type,
    status: task.status,
    priority: task.priority,
    subjectId: task.subjectId,
    dueDate: task.dueDate,
    dueTime: task.dueTime,

    subtasks: task.subtasks.map((subtask) => ({ ...subtask })),

    progress:
      task.subtasks.length > 0
        ? Math.round(
            (task.subtasks.filter((subtask) => subtask.completed).length /
              task.subtasks.length) *
              100
          )
        : task.status === "realizada"
          ? 100
          : 0,

    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
  };
}

export function createTask(
  userId: number,
  data: CreateTaskDto
): TaskResponseDto {
  const now = new Date();

  const task: Task = {
    id: randomUUID(),
    userId,
    title: data.title.trim(),
    description: data.description?.trim() ?? "",
    type: data.type,
    status: "pendiente",
    priority: data.priority,
    subjectId: data.subjectId ?? null,
    dueDate: data.dueDate ?? null,
    dueTime: data.dueTime ?? null,
    subtasks: data.subtasks?.map((subtask) => ({ ...subtask })) ?? [],
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };

  tasks.push(task);

  return toTaskResponse(task);
}

export function listTasks(
  userId: number,
  filters: TaskListQueryDto = {}
): { tasks: TaskResponseDto[]; total: number } {
  let result = tasks.filter((task) => task.userId === userId);

  if (filters.status) {
    result = result.filter((task) => task.status === filters.status);
  }

  if (filters.type) {
    result = result.filter((task) => task.type === filters.type);
  }

  if (filters.priority) {
    result = result.filter((task) => task.priority === filters.priority);
  }

  if (filters.subjectId) {
    result = result.filter((task) => task.subjectId === filters.subjectId);
  }

  if (filters.dueDate) {
    result = result.filter((task) => task.dueDate === filters.dueDate);
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();

    result = result.filter(
      (task) =>
        task.title.toLowerCase().includes(search) ||
        task.description.toLowerCase().includes(search)
    );
  }

  result.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  return {
    tasks: result.map(toTaskResponse),
    total: result.length,
  };
}

export function getTaskById(
  userId: number,
  taskId: string
): TaskResponseDto {
  const task = tasks.find(
    (item) => item.id === taskId && item.userId === userId
  );

  if (!task) {
    throw new HttpError(404, "Tarea no encontrada");
  }

  return toTaskResponse(task);
}

export function updateTask(
  userId: number,
  taskId: string,
  data: UpdateTaskDto
): TaskResponseDto {
  const task = tasks.find(
    (item) => item.id === taskId && item.userId === userId
  );

  if (!task) {
    throw new HttpError(404, "Tarea no encontrada");
  }

  if (data.title !== undefined) {
    task.title = data.title.trim();
  }

  if (data.description !== undefined) {
    task.description = data.description.trim();
  }

  if (data.type !== undefined) task.type = data.type;
  if (data.priority !== undefined) task.priority = data.priority;
  if (data.subjectId !== undefined) task.subjectId = data.subjectId;
  if (data.dueDate !== undefined) task.dueDate = data.dueDate;
  if (data.dueTime !== undefined) task.dueTime = data.dueTime;

  if (data.subtasks !== undefined) {
    task.subtasks = data.subtasks.map((subtask) => ({ ...subtask }));
  }

  if (data.status !== undefined) {
    task.status = data.status;
    task.completedAt =
      data.status === "realizada" ? new Date() : null;
  }

  task.updatedAt = new Date();

  return toTaskResponse(task);
}

export function deleteTask(userId: number, taskId: string): void {
  const index = tasks.findIndex(
    (item) => item.id === taskId && item.userId === userId
  );

  if (index === -1) {
    throw new HttpError(404, "Tarea no encontrada");
  }

  tasks.splice(index, 1);
}

export function completeTask(
  userId: number,
  taskId: string
): TaskResponseDto {
  return updateTask(userId, taskId, {
    status: "realizada",
  });
}

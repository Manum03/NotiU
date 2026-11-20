import { randomUUID } from "node:crypto";
import { db } from "../config/firebase";
import { Task, TaskSource } from "../models/task.model";
import {
  CreateTaskDto,
  TaskListQueryDto,
  TaskListResponseDto,
  TaskResponseDto,
  UpdateTaskDto,
} from "../models/task.dto";
import { HttpError } from "../utils/http-error";
import { toDate, toDateOrNow } from "../utils/firestore";
import { shortHash } from "../utils/crypto";
import { fromAppDateParts } from "../utils/dates";
import { fold } from "../utils/text";
import { reminderService } from "./reminder.service";
import { subjectService } from "./subject.service";

// Tareas en Firestore: `users/{uid}/tasks/{taskId}`.
// Incluye las que crea el estudiante (MANUAL) y las importadas de Moodle/Classroom.
// Las importadas usan un id determinístico (fuente + id externo) para poder actualizarlas
// en cada sincronización sin duplicarlas.
export const tasksCol = (userId: string) => db.collection("users").doc(userId).collection("tasks");

export const taskIdFor = (source: TaskSource, externalId: string): string =>
  `${source.toLowerCase()}_${shortHash(externalId)}`;

// Instante exacto de la entrega (dueDate + dueTime en hora de Colombia)
export const taskDueAt = (task: Pick<Task, "dueDate" | "dueTime">): Date | null =>
  task.dueDate ? fromAppDateParts(task.dueDate, task.dueTime) : null;

// ¿Tiene sentido avisar/recordar esta tarea? (no realizada, no archivada, no es nota y aún no vence)
export const isActionable = (task: Task, now = new Date()): boolean => {
  if (task.status === "realizada" || task.type === "nota" || task.archivedAt) return false;
  const dueAt = taskDueAt(task);
  return dueAt !== null && dueAt.getTime() > now.getTime();
};

export const taskFromDoc = (userId: string, id: string, d: FirebaseFirestore.DocumentData): Task => ({
  id,
  userId,
  title: String(d.title ?? ""),
  description: String(d.description ?? ""),
  type: d.type ?? "tarea",
  status: d.status ?? "pendiente",
  priority: d.priority ?? "media",
  subjectId: d.subjectId ?? null,
  dueDate: d.dueDate ?? null,
  dueTime: d.dueTime ?? null,
  subtasks: Array.isArray(d.subtasks) ? d.subtasks : [],
  createdAt: toDateOrNow(d.createdAt),
  updatedAt: toDateOrNow(d.updatedAt),
  completedAt: toDate(d.completedAt),
  archivedAt: toDate(d.archivedAt),
  source: d.source ?? "MANUAL",
  externalId: d.externalId ?? null,
  courseName: d.courseName ?? null,
  url: d.url ?? null,
  platformStatus: d.platformStatus ?? "unknown",
});

export const taskToDoc = (task: Task): Omit<Task, "id"> => {
  const { id: _id, ...rest } = task;
  return rest;
};

export const toTaskResponse = (task: Task, now = new Date()): TaskResponseDto => {
  const dueAt = taskDueAt(task);
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
            (task.subtasks.filter((subtask) => subtask.completed).length / task.subtasks.length) * 100,
          )
        : task.status === "realizada"
          ? 100
          : 0,

    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
    archivedAt: task.archivedAt,
    isArchived: task.archivedAt !== null,

    source: task.source,
    courseName: task.courseName,
    url: task.url,
    dueAt: dueAt?.toISOString() ?? null,
    isOverdue: dueAt !== null && task.status !== "realizada" && dueAt.getTime() < now.getTime(),
  };
};

// Orden: primero las que tienen fecha (la más próxima primero), al final las sin fecha
const byDueAt = (a: Task, b: Task): number => {
  const dueA = taskDueAt(a);
  const dueB = taskDueAt(b);
  if (dueA && dueB) return dueA.getTime() - dueB.getTime();
  if (dueA) return -1;
  if (dueB) return 1;
  return b.createdAt.getTime() - a.createdAt.getTime();
};

// 404 si la materia no existe o no es del usuario
const ensureOwnedSubject = async (userId: string, subjectId: string | null | undefined): Promise<void> => {
  if (!subjectId) return;
  await subjectService.getOwnedSubject(userId, subjectId);
};

const findOrFail = async (userId: string, taskId: string): Promise<Task> => {
  const snap = await tasksCol(userId).doc(taskId).get();
  if (!snap.exists) throw new HttpError(404, "Tarea no encontrada");
  return taskFromDoc(userId, snap.id, snap.data() ?? {});
};

export const taskService = {
  async createTask(userId: string, data: CreateTaskDto): Promise<TaskResponseDto> {
    await ensureOwnedSubject(userId, data.subjectId);
    const now = new Date();
    const ref = tasksCol(userId).doc(randomUUID());

    const task: Task = {
      id: ref.id,
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
      archivedAt: null,
      source: "MANUAL",
      externalId: null,
      courseName: null,
      url: null,
      platformStatus: "unknown",
    };

    await ref.set(taskToDoc(task));
    await reminderService.scheduleForTask(task);
    return toTaskResponse(task);
  },

  async listTasks(userId: string, filters: TaskListQueryDto = {}): Promise<TaskListResponseDto> {
    let result = await taskService.listAll(userId);

    // Por defecto solo las activas; con archived=true, solo las archivadas
    const wantArchived = filters.archived === true;
    result = result.filter((task) => (task.archivedAt !== null) === wantArchived);

    if (filters.status) result = result.filter((task) => task.status === filters.status);
    if (filters.type) result = result.filter((task) => task.type === filters.type);
    if (filters.priority) result = result.filter((task) => task.priority === filters.priority);
    if (filters.subjectId) result = result.filter((task) => task.subjectId === filters.subjectId);
    if (filters.dueDate) result = result.filter((task) => task.dueDate === filters.dueDate);
    if (filters.source) result = result.filter((task) => task.source === filters.source);

    if (filters.search) {
      const search = fold(filters.search);
      result = result.filter(
        (task) =>
          fold(task.title).includes(search) ||
          fold(task.description).includes(search) ||
          fold(task.courseName ?? "").includes(search),
      );
    }

    result.sort(byDueAt);
    const now = new Date();
    return { tasks: result.map((t) => toTaskResponse(t, now)), total: result.length };
  },

  async getTaskById(userId: string, taskId: string): Promise<TaskResponseDto> {
    return toTaskResponse(await findOrFail(userId, taskId));
  },

  async updateTask(userId: string, taskId: string, data: UpdateTaskDto): Promise<TaskResponseDto> {
    const task = await findOrFail(userId, taskId);

    // Lo que define la plataforma no se edita: se sobrescribiría en la próxima sincronización
    const editsPlatformFields =
      data.title !== undefined ||
      data.description !== undefined ||
      data.type !== undefined ||
      data.dueDate !== undefined ||
      data.dueTime !== undefined;
    if (task.source !== "MANUAL" && editsPlatformFields) {
      throw new HttpError(400, "En las tareas importadas solo puedes cambiar estado, prioridad, materia y subtareas");
    }
    if (data.subjectId !== undefined) await ensureOwnedSubject(userId, data.subjectId);

    if (data.title !== undefined) task.title = data.title.trim();
    if (data.description !== undefined) task.description = data.description.trim();
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
      task.completedAt = data.status === "realizada" ? new Date() : null;
    }

    task.updatedAt = new Date();

    await tasksCol(userId).doc(taskId).set(taskToDoc(task));
    await reminderService.scheduleForTask(task); // cancela o reprograma según el nuevo estado
    return toTaskResponse(task);
  },

  async deleteTask(userId: string, taskId: string): Promise<void> {
    const task = await findOrFail(userId, taskId);
    if (task.source !== "MANUAL") {
      throw new HttpError(400, "Las tareas importadas no se eliminan: márcalas como realizadas o archívalas");
    }
    await tasksCol(userId).doc(taskId).delete();
    await reminderService.cancelForTask(userId, taskId);
  },

  async completeTask(userId: string, taskId: string): Promise<TaskResponseDto> {
    return taskService.updateTask(userId, taskId, { status: "realizada" });
  },

  // Archivar: la tarea sale de la lista principal y se cancelan sus recordatorios
  async archiveTask(userId: string, taskId: string): Promise<TaskResponseDto> {
    const task = await findOrFail(userId, taskId);
    if (task.archivedAt) throw new HttpError(409, "La tarea ya está archivada");
    task.archivedAt = new Date();
    task.updatedAt = new Date();
    await tasksCol(userId).doc(taskId).set(taskToDoc(task));
    await reminderService.cancelForTask(userId, taskId);
    return toTaskResponse(task);
  },

  // Restaurar: vuelve a la lista principal y se reprograman sus recordatorios
  async restoreTask(userId: string, taskId: string): Promise<TaskResponseDto> {
    const task = await findOrFail(userId, taskId);
    if (!task.archivedAt) throw new HttpError(409, "La tarea no está archivada");
    task.archivedAt = null;
    task.updatedAt = new Date();
    await tasksCol(userId).doc(taskId).set(taskToDoc(task));
    await reminderService.scheduleForTask(task);
    return toTaskResponse(task);
  },

  // ---- Usados por la sincronización y los recordatorios ----

  async listAll(userId: string): Promise<Task[]> {
    const snap = await tasksCol(userId).get();
    return snap.docs.map((d) => taskFromDoc(userId, d.id, d.data()));
  },

  async listBySource(userId: string, source: TaskSource): Promise<Map<string, Task>> {
    const snap = await tasksCol(userId).where("source", "==", source).get();
    return new Map(snap.docs.map((d) => [d.id, taskFromDoc(userId, d.id, d.data())]));
  },

  async get(userId: string, taskId: string): Promise<Task | null> {
    const snap = await tasksCol(userId).doc(taskId).get();
    return snap.exists ? taskFromDoc(userId, snap.id, snap.data() ?? {}) : null;
  },

  // Borra todas las tareas de una fuente (al desconectar una integración)
  async removeBySource(userId: string, source: TaskSource): Promise<number> {
    const tasks = await taskService.listBySource(userId, source);
    for (const id of tasks.keys()) {
      await tasksCol(userId).doc(id).delete();
      await reminderService.cancelForTask(userId, id);
    }
    return tasks.size;
  },
};

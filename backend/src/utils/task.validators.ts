import { randomUUID } from "node:crypto";
import { CreateTaskDto, TaskListQueryDto, UpdateTaskDto } from "../models/task.dto";
import {
  TASK_PRIORITIES,
  TASK_SOURCES,
  TASK_STATUSES,
  TASK_TYPES,
  TaskPriority,
  TaskSource,
  TaskStatus,
  TaskSubtask,
  TaskType,
} from "../models/task.model";
import { HttpError } from "./http-error";

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 2000;
const MAX_SUBTASKS = 30;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:mm (24 horas)

const ensureObject = (body: unknown): Record<string, unknown> => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "El cuerpo de la petición debe ser un objeto JSON");
  }
  return body as Record<string, unknown>;
};

const fail = (errors: string[]): void => {
  if (errors.length > 0) throw new HttpError(400, "Datos inválidos", errors);
};

const isValidDate = (v: string): boolean => {
  if (!DATE_REGEX.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

const checkEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  errors: string[],
): T | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    errors.push(`${field} debe ser uno de: ${allowed.join(", ")}`);
    return undefined;
  }
  return value as T;
};

const checkTitle = (value: unknown, errors: string[]): string | undefined => {
  const title = typeof value === "string" ? value.trim() : "";
  if (title.length < 1 || title.length > MAX_TITLE) {
    errors.push(`title es obligatorio y debe tener entre 1 y ${MAX_TITLE} caracteres`);
    return undefined;
  }
  return title;
};

const checkDescription = (value: unknown, errors: string[]): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > MAX_DESCRIPTION) {
    errors.push(`description debe ser un texto de máximo ${MAX_DESCRIPTION} caracteres`);
    return undefined;
  }
  return value;
};

// null borra el valor; undefined = no se envió
const checkNullable = (
  value: unknown,
  field: string,
  valid: (v: string) => boolean,
  hint: string,
  errors: string[],
): string | null | undefined => {
  if (value === undefined || value === null) return value as null | undefined;
  if (typeof value !== "string" || !valid(value)) {
    errors.push(`${field} debe tener el formato ${hint}`);
    return undefined;
  }
  return value;
};

const checkSubjectId = (value: unknown, errors: string[]): string | null | undefined => {
  if (value === undefined || value === null) return value as null | undefined;
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) {
    errors.push("subjectId no es válido");
    return undefined;
  }
  return value;
};

const checkSubtasks = (value: unknown, errors: string[]): TaskSubtask[] | undefined => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > MAX_SUBTASKS) {
    errors.push(`subtasks debe ser una lista de máximo ${MAX_SUBTASKS} elementos`);
    return undefined;
  }
  const result: TaskSubtask[] = [];
  value.forEach((item, i) => {
    const s = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    const title = typeof s.title === "string" ? s.title.trim() : "";
    if (!title || title.length > MAX_TITLE) {
      errors.push(`subtasks[${i}].title es obligatorio (máximo ${MAX_TITLE} caracteres)`);
      return;
    }
    if (s.completed !== undefined && typeof s.completed !== "boolean") {
      errors.push(`subtasks[${i}].completed debe ser true o false`);
      return;
    }
    // Si la app no manda id (subtarea nueva), se genera uno
    const id = typeof s.id === "string" && s.id.trim() ? s.id.trim() : randomUUID();
    result.push({ id, title, completed: s.completed === true });
  });
  return result;
};

export const validateTaskId = (value: unknown): string => {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) {
    throw new HttpError(400, "Datos inválidos", ["Identificador de tarea inválido"]);
  }
  return value;
};

export const validateCreateTask = (body: unknown): CreateTaskDto => {
  const b = ensureObject(body);
  const errors: string[] = [];

  const title = checkTitle(b.title, errors);
  const dto: CreateTaskDto = {
    title: title ?? "",
    // Valores por defecto si la app no los envía
    type: checkEnum<TaskType>(b.type, TASK_TYPES, "type", errors) ?? "tarea",
    priority: checkEnum<TaskPriority>(b.priority, TASK_PRIORITIES, "priority", errors) ?? "media",
  };
  dto.description = checkDescription(b.description, errors);
  dto.subjectId = checkSubjectId(b.subjectId, errors);
  dto.dueDate = checkNullable(b.dueDate, "dueDate", isValidDate, "YYYY-MM-DD", errors);
  dto.dueTime = checkNullable(b.dueTime, "dueTime", (v) => TIME_REGEX.test(v), "HH:mm (24 horas)", errors);
  dto.subtasks = checkSubtasks(b.subtasks, errors);
  if (dto.dueTime && !dto.dueDate) errors.push("dueTime requiere dueDate");

  fail(errors);
  return dto;
};

export const validateUpdateTask = (body: unknown): UpdateTaskDto => {
  const b = ensureObject(body);
  const errors: string[] = [];
  const dto: UpdateTaskDto = {};

  if (b.title !== undefined) dto.title = checkTitle(b.title, errors);
  dto.description = checkDescription(b.description, errors);
  dto.type = checkEnum<TaskType>(b.type, TASK_TYPES, "type", errors);
  dto.status = checkEnum<TaskStatus>(b.status, TASK_STATUSES, "status", errors);
  dto.priority = checkEnum<TaskPriority>(b.priority, TASK_PRIORITIES, "priority", errors);
  dto.subjectId = checkSubjectId(b.subjectId, errors);
  dto.dueDate = checkNullable(b.dueDate, "dueDate", isValidDate, "YYYY-MM-DD", errors);
  dto.dueTime = checkNullable(b.dueTime, "dueTime", (v) => TIME_REGEX.test(v), "HH:mm (24 horas)", errors);
  dto.subtasks = checkSubtasks(b.subtasks, errors);

  fail(errors);
  // Se quitan las llaves que no llegaron (undefined) para saber si hay algo que actualizar
  const clean = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined)) as UpdateTaskDto;
  if (Object.keys(clean).length === 0) {
    throw new HttpError(400, "Datos inválidos", [
      "Debes enviar al menos un campo: title, description, type, status, priority, subjectId, dueDate, dueTime o subtasks",
    ]);
  }
  return clean;
};

export const validateListTasksQuery = (query: unknown): TaskListQueryDto => {
  const q = (query ?? {}) as Record<string, unknown>;
  const errors: string[] = [];
  const read = (key: string): string | undefined => {
    const v = q[key];
    if (v === undefined) return undefined;
    if (typeof v !== "string") {
      errors.push(`${key} debe ser un único valor`);
      return undefined;
    }
    return v.trim() || undefined;
  };

  const filters: TaskListQueryDto = {
    status: checkEnum<TaskStatus>(read("status"), TASK_STATUSES, "status", errors),
    type: checkEnum<TaskType>(read("type"), TASK_TYPES, "type", errors),
    priority: checkEnum<TaskPriority>(read("priority"), TASK_PRIORITIES, "priority", errors),
    source: checkEnum<TaskSource>(read("source")?.toUpperCase(), TASK_SOURCES, "source", errors),
    subjectId: read("subjectId"),
    search: read("search")?.slice(0, 100),
  };
  const archived = read("archived");
  if (archived !== undefined) {
    if (archived === "true" || archived === "false") filters.archived = archived === "true";
    else errors.push("archived debe ser true o false");
  }

  const dueDate = read("dueDate");
  if (dueDate !== undefined) {
    if (isValidDate(dueDate)) filters.dueDate = dueDate;
    else errors.push("dueDate debe tener el formato YYYY-MM-DD");
  }

  fail(errors);
  return filters;
};

export const TASK_STATUSES = [
  "pendiente",
  "en_curso",
  "realizada",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = [
  "baja",
  "media",
  "alta",
] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_TYPES = [
  "tarea",
  "recordatorio",
  "nota",
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

// De dónde viene la tarea: creada en NotiU o importada de una plataforma
export const TASK_SOURCES = [
  "MANUAL",
  "MOODLE",
  "CLASSROOM",
] as const;

export type TaskSource = (typeof TASK_SOURCES)[number];

// Lo que reporta la plataforma de origen (el iCal de Moodle no informa entregas -> "unknown")
export type PlatformStatus = "pending" | "submitted" | "unknown";

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  userId: string; // UID de Firebase
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  subjectId: string | null;
  dueDate: string | null; // "YYYY-MM-DD" (hora de Colombia)
  dueTime: string | null; // "HH:mm"; null = hasta el final del día
  subtasks: TaskSubtask[];
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  archivedAt: Date | null; // archivada por el estudiante (no aparece en la lista normal)

  // ---- Integraciones (Moodle / Classroom) ----
  source: TaskSource;
  externalId: string | null; // UID del evento iCal / id del courseWork de Classroom
  courseName: string | null; // nombre del curso en la plataforma
  url: string | null; // enlace para abrir la actividad en la plataforma
  platformStatus: PlatformStatus;
}

// Forma normalizada que devuelve cada conector antes de guardarse
export interface ExternalTask {
  externalId: string;
  title: string;
  description: string | null;
  courseName: string | null;
  url: string | null;
  dueAt: Date | null;
  allDay: boolean;
  platformStatus: PlatformStatus;
}

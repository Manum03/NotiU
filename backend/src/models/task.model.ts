
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

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  userId: number;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  subjectId: string | null;
  dueDate: string | null;
  dueTime: string | null;
  subtasks: TaskSubtask[];
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

import {
  TaskPriority,
  TaskSource,
  TaskStatus,
  TaskType,
  TaskSubtask,
} from "./task.model";

export interface CreateTaskDto {
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  subjectId?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  subtasks?: TaskSubtask[];
}

// En tareas importadas (Moodle/Classroom) no se pueden cambiar título, descripción,
// tipo ni fecha: los define la plataforma y se sobrescribirían en la siguiente sincronización.
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  subjectId?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  subtasks?: TaskSubtask[];
}

export interface TaskResponseDto {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  subjectId: string | null;
  dueDate: string | null;
  dueTime: string | null;
  subtasks: TaskSubtask[];
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  archivedAt: Date | null;
  isArchived: boolean;

  // ---- Integraciones ----
  source: TaskSource;
  courseName: string | null;
  url: string | null;
  dueAt: string | null; // instante exacto (ISO) calculado con dueDate + dueTime
  isOverdue: boolean;
}

export interface TaskListQueryDto {
  status?: TaskStatus;
  type?: TaskType;
  priority?: TaskPriority;
  subjectId?: string;
  dueDate?: string;
  search?: string;
  source?: TaskSource;
  archived?: boolean; // true = solo archivadas; por defecto, solo las no archivadas
}

export interface TaskListResponseDto {
  tasks: TaskResponseDto[];
  total: number;
}

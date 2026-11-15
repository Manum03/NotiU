
import {
  TaskPriority,
  TaskStatus,
  TaskType,
} from "./task.model";

export interface CreateTaskDto {
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  subjectId?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  subjectId?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
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
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface TaskListQueryDto {
  status?: TaskStatus;
  type?: TaskType;
  priority?: TaskPriority;
  subjectId?: string;
  dueDate?: string;
  search?: string;
}

export interface TaskListResponseDto {
  tasks: TaskResponseDto[];
  total: number;
}

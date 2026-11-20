// Tarea tal como la devuelve el backend (GET /tasks, GET /tasks/:id)
export type TaskSource = 'MANUAL' | 'MOODLE' | 'CLASSROOM';
export type TaskStatus = 'pendiente' | 'en_curso' | 'realizada';
export type TaskType = 'tarea' | 'recordatorio' | 'nota';
export type TaskPriority = 'baja' | 'media' | 'alta';

export type Subtask = { id: string; title: string; completed: boolean };

export type TaskDto = {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  subjectId: string | null;
  dueDate: string | null; // "YYYY-MM-DD"
  dueTime: string | null; // "HH:mm" (null = todo el día)
  subtasks: Subtask[];
  progress: number; // 0-100
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  source: TaskSource;
  courseName: string | null;
  url: string | null;
  dueAt: string | null; // ISO, calculado por el backend
  isOverdue: boolean;
};

export type TasksResponse = { tasks: TaskDto[]; total: number };
export type TaskResponse = { task: TaskDto };
export type TaskMutationResponse = { message: string; task: TaskDto };

// Nombre visible de la plataforma de origen
export const SOURCE_LABEL: Record<TaskSource, string> = {
  MANUAL: 'NotiU',
  MOODLE: 'Moodle',
  CLASSROOM: 'Classroom',
};

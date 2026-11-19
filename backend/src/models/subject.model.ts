
export const SUBJECT_STATUSES = [
  "cursando",
  "aprobada",
  "pendiente",
] as const;

export type SubjectStatus = (typeof SUBJECT_STATUSES)[number];

export const SUBJECT_PRIORITIES = [
  "alta",
  "media",
  "baja",
  "sin_fecha",
] as const;

export type SubjectPriority = (typeof SUBJECT_PRIORITIES)[number];

export const ACTIVITY_TYPES = [
  "tarea",
  "trabajo",
  "examen",
  "proyecto",
  "lectura",
  "otro",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const WEEK_DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

export interface ScheduleBlock {
  day: WeekDay;
  startTime: string;
  endTime: string;
  room?: string;
}

export interface SubjectReminder {
  enabled: boolean;
  dateTime?: string;
}

export interface Subject {
  id: string;
  userId: number;

  name: string;
  code: string;
  credits: number;
  semester: number;
  teacher: string;
  color: string;

  status: SubjectStatus;
  priority: SubjectPriority;

  description: string;
  dueDate: string | null;
  dueTime: string | null;
  activityType: ActivityType | null;

  reminder: SubjectReminder;
  notes: string;
  progress: number;

  schedule: ScheduleBlock[];
  createdAt: Date;
}

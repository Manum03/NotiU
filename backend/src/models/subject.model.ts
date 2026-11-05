export const SUBJECT_STATUSES = ["cursando", "aprobada", "pendiente"] as const;
export type SubjectStatus = (typeof SUBJECT_STATUSES)[number];

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
  startTime: string; // "HH:mm" (24 horas)
  endTime: string;
  room?: string;
}

export interface Subject {
  id: string;
  userId: number; // dueño de la materia: de aquí sale el aislamiento entre usuarios
  name: string;
  code: string;
  credits: number;
  semester: number;
  teacher: string;
  color: string;
  status: SubjectStatus;
  schedule: ScheduleBlock[];
  createdAt: Date;
}
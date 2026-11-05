import { ScheduleBlock, Subject, SubjectStatus } from "./subject.model";

export interface CreateSubjectDto {
  name: string;
  code: string;
  credits: number;
  semester: number;
  teacher?: string;
  color?: string;
  schedule?: ScheduleBlock[];
}

// Lo que se devuelve al cliente: nunca incluye el userId interno
export type SubjectResponseDto = Omit<Subject, "userId" | "createdAt">;

export interface CreateSubjectResponseDto {
  message: string;
  subject: SubjectResponseDto;
}

// ---- Listado (GET /api/subjects) ----
export interface ListSubjectsFilters {
  semester?: number;
  status?: SubjectStatus;
  search?: string;
}

export interface SubjectListItemDto {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  status: SubjectStatus;
  teacher: string;
  color: string;
  currentAverage: number;
}

export interface ListSubjectsResponseDto {
  data: SubjectListItemDto[];
  total: number;
}
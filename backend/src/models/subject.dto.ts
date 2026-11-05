import { ScheduleBlock, Subject } from "./subject.model";

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
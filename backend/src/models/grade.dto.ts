import { Corte, Grade } from "./grade.model";

export interface CreateGradeDto {
  title: string;
  score: number;
  weight: number;
  corte?: Corte;
  date?: string;
}

export type GradeResponseDto = Grade;

export interface CreateGradeResponseDto {
  message: string;
  grade: GradeResponseDto;
}
// ---- Listado por materia (GET /api/subjects/:subjectId/grades) ----
// La nota sin subjectId: ese dato ya va en la raíz de la respuesta
export type GradeItemDto = Omit<Grade, "subjectId">;

export interface SubjectGradesResponseDto {
  subjectId: string;
  grades: GradeItemDto[];
  totalWeight: number;
  weightedAverage: number;
}
// ---- Consolidado (GET /api/grades) ----
export interface ListGradesFilters {
  semester?: number;
  corte?: Corte;
}

export interface GradeListItemDto {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  score: number;
  weight: number;
  corte?: Corte;
  date: string;
}

export interface ListGradesResponseDto {
  data: GradeListItemDto[];
}
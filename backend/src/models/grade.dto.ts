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
// ---- Avance (GET /api/subjects/:subjectId/progress) ----
export type ProgressStatus =
  | "aprobada" // no queda nada por evaluar y alcanzó la nota mínima
  | "reprobada" // no queda nada por evaluar y no la alcanzó
  | "aprobacion_asegurada" // aunque saque 0 en lo que falta, ya aprueba
  | "imposible_aprobar" // necesitaría más de 5.0 en lo que falta
  | "en_curso";

export interface SubjectProgressDto {
  subjectId: string;
  evaluatedPercentage: number;
  remainingPercentage: number;
  accumulatedScore: number;
  currentAverage: number;
  neededToPass: number | null; // null solo si ya no queda porcentaje por evaluar
  minPassingGrade: number;
  status: ProgressStatus;
}
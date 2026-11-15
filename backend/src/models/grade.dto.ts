import { Corte, Grade } from "./grade.model";
import { GradesSummaryDto } from "./subject.dto";

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
// ---- Actualización (PATCH /api/grades/:gradeId) ----
// Todo es opcional: PATCH = actualización parcial
export interface UpdateGradeDto {
  title?: string;
  score?: number;
  weight?: number;
  corte?: Corte | null; // null quita el corte de la nota
  date?: string;
}

export interface UpdateGradeResponseDto {
  message: string;
  grade: GradeResponseDto;
}

// ---- Eliminación (DELETE /api/grades/:gradeId) ----
export interface DeleteGradeResponseDto {
  message: string;
  deletedId: string;
  subjectId: string;
  gradesSummary: GradesSummaryDto; // resumen de la materia YA sin la nota eliminada
}

// ---- Promedio general (GET /api/grades/average) ----
export type GradesAverageFilters = Pick<ListGradesFilters, "semester">;

export interface SubjectAverageDto {
  subjectId: string;
  name: string;
  average: number;
  credits: number;
  semester: number;
  status: ProgressStatus;
}

export interface GradesAverageResponseDto {
  pga: number | null; // null si ninguna materia tiene notas todavía
  totalCredits: number; // créditos de las materias con notas (el denominador del PGA)
  approvedSubjects: number;
  atRiskSubjects: number;
  ungradedSubjects: number; // materias del alcance consultado que aún no tienen notas
  bySubject: SubjectAverageDto[];
}
import { randomUUID } from "node:crypto";
import {
  CreateGradeDto,
  CreateGradeResponseDto,
  GradeItemDto,
  SubjectGradesResponseDto,
} from "../models/grade.dto";
import { Grade } from "../models/grade.model";
import { GradesSummaryDto } from "../models/subject.dto";
import { Subject } from "../models/subject.model";
import { HttpError } from "../utils/http-error";

// ---- Almacenamiento en memoria (no hay base de datos) ----
// Los datos se pierden al reiniciar el servidor
const grades: Grade[] = [];

// Los porcentajes y las notas se calculan en centésimas (enteros) para evitar
// errores de decimales: 33.3 + 33.3 + 33.4 debe dar exactamente 100
const toHundredths = (n: number): number => Math.round(n * 100);
const TOTAL_HUNDREDTHS = 10000; // 100%

const round2 = (n: number): number => Math.round(n * 100) / 100;

// Fecha de hoy en hora local del servidor, formato YYYY-MM-DD
const todayLocal = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const gradesOf = (subjectId: string): Grade[] => grades.filter((g) => g.subjectId === subjectId);

// Copia de la nota sin subjectId (ya va en la raíz de la respuesta)
const toGradeItem = ({ subjectId, ...rest }: Grade): GradeItemDto => ({ ...rest });

// Fórmula única del promedio ponderado: la reutilizan #20, #12 y #13
const summarize = (subjectGrades: Grade[]): GradesSummaryDto => {
  let weightSum = 0; // Σ porcentaje (en centésimas)
  let weighted = 0; // Σ nota × porcentaje (centésimas × centésimas)
  for (const g of subjectGrades) {
    const w = toHundredths(g.weight);
    weightSum += w;
    weighted += toHundredths(g.score) * w;
  }
  return {
    count: subjectGrades.length,
    totalWeight: weightSum / 100,
    // Sin notas no hay promedio: se devuelve 0 (se distingue por count === 0)
    weightedAverage: weightSum === 0 ? 0 : round2(weighted / weightSum / 100),
  };
};

// Este service NO importa a subject.service (evita un import circular):
// recibe la materia ya validada, y el controller se encarga de comprobar la propiedad
export const gradeService = {
  createGrade(subject: Subject, dto: CreateGradeDto): CreateGradeResponseDto {
    const usedHundredths = gradesOf(subject.id).reduce((sum, g) => sum + toHundredths(g.weight), 0);

    if (usedHundredths + toHundredths(dto.weight) > TOTAL_HUNDREDTHS) {
      const available = (TOTAL_HUNDREDTHS - usedHundredths) / 100;
      throw new HttpError(400, "Datos inválidos", [
        `La suma de porcentajes supera el 100%: ya hay ${usedHundredths / 100}% asignado y solo quedan ${available}% disponibles`,
      ]);
    }

    const grade: Grade = {
      id: randomUUID(),
      subjectId: subject.id, // viene de la materia validada, nunca del body
      title: dto.title,
      score: dto.score,
      weight: dto.weight,
      corte: dto.corte, // si es undefined, JSON lo omite
      date: dto.date ?? todayLocal(),
      createdAt: new Date().toISOString(),
    };
    grades.push(grade);

    return { message: "Calificación registrada", grade: { ...grade } };
  },

  // Resumen de las notas de una materia (cantidad, % evaluado y promedio ponderado)
  getSummary(subjectId: string): GradesSummaryDto {
    return summarize(gradesOf(subjectId));
  },

  listBySubject(subject: Subject): SubjectGradesResponseDto {
    const subjectGrades = gradesOf(subject.id);
    const { totalWeight, weightedAverage } = summarize(subjectGrades);

    // Cronológico; si coincide la fecha, por hora de creación. [...] evita alterar el original
    const ordered = [...subjectGrades]
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.createdAt.localeCompare(b.createdAt))
      .map(toGradeItem);

    return { subjectId: subject.id, grades: ordered, totalWeight, weightedAverage };
  },
};
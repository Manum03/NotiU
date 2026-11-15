import { randomUUID } from "node:crypto";
import {
  CreateGradeDto,
  CreateGradeResponseDto,
  DeleteGradeResponseDto,
  GradeItemDto,
  GradeListItemDto,
  GradesAverageFilters,
  GradesAverageResponseDto,
  ListGradesFilters,
  ListGradesResponseDto,
  ProgressStatus,
  SubjectAverageDto,
  SubjectGradesResponseDto,
  SubjectProgressDto,
  UpdateGradeDto,
  UpdateGradeResponseDto,
} from "../models/grade.dto";
import { Grade, MIN_PASSING_GRADE } from "../models/grade.model";
import { GradesSummaryDto } from "../models/subject.dto";
import { Subject } from "../models/subject.model";
import { HttpError } from "../utils/http-error";

// ---- Almacenamiento en memoria (no hay base de datos) ----
// Los datos se pierden al reiniciar el servidor.
// Es "let" porque al borrar una materia se reemplaza por la lista sin sus notas
let grades: Grade[] = [];

// Los porcentajes y las notas se calculan en centésimas (enteros) para evitar
// errores de decimales: 33.3 + 33.3 + 33.4 debe dar exactamente 100
const toHundredths = (n: number): number => Math.round(n * 100);
const TOTAL_HUNDREDTHS = 10000; // 100%
const MAX_SCORE = 5;

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

// Base común de todos los cálculos, en enteros exactos:
// - weightSum: Σ porcentaje, en centésimas de % (10000 = 100%)
// - weighted:  Σ nota × porcentaje (puntos ganados = weighted / 1.000.000)
const totalsOf = (subjectGrades: Grade[]): { weightSum: number; weighted: number } => {
  let weightSum = 0;
  let weighted = 0;
  for (const g of subjectGrades) {
    const w = toHundredths(g.weight);
    weightSum += w;
    weighted += toHundredths(g.score) * w;
  }
  return { weightSum, weighted };
};

// Fórmula única del promedio ponderado: la reutilizan #20, #12 y #13
const summarize = (subjectGrades: Grade[]): GradesSummaryDto => {
  const { weightSum, weighted } = totalsOf(subjectGrades);
  return {
    count: subjectGrades.length,
    totalWeight: weightSum / 100,
    // Sin notas no hay promedio: se devuelve 0 (se distingue por count === 0)
    weightedAverage: weightSum === 0 ? 0 : round2(weighted / weightSum / 100),
  };
};

// División entera HACIA ARRIBA, solo con enteros positivos (sin errores de coma flotante)
const ceilDiv = (a: number, b: number): number => {
  const n = a + b - 1;
  return (n - (n % b)) / b;
};

// Avance de la materia: porcentaje evaluado y nota necesaria para aprobar
const buildProgress = (subjectId: string, subjectGrades: Grade[]): SubjectProgressDto => {
  const { weightSum, weighted } = totalsOf(subjectGrades);
  const remaining = TOTAL_HUNDREDTHS - weightSum; // centésimas de % que faltan por evaluar
  // La nota mínima en las mismas unidades que "weighted" (3.0 -> 3.000.000)
  const minPoints = toHundredths(MIN_PASSING_GRADE) * TOTAL_HUNDREDTHS;
  const missing = minPoints - weighted; // puntos que faltan para llegar a la nota mínima

  let neededToPass: number | null;
  let status: ProgressStatus;

  if (remaining === 0) {
    // Ya está todo evaluado: no hay porcentaje donde sacar una nota
    neededToPass = null;
    status = missing <= 0 ? "aprobada" : "reprobada";
  } else if (missing <= 0) {
    // Aunque saque 0 en lo que falta, ya aprueba
    neededToPass = 0;
    status = "aprobacion_asegurada";
  } else {
    // Nota necesaria en lo que falta, redondeada HACIA ARRIBA a 2 decimales
    // para que el valor mostrado siempre alcance (missing / remaining = centésimas de nota)
    neededToPass = ceilDiv(missing, remaining) / 100;
    status = neededToPass > MAX_SCORE ? "imposible_aprobar" : "en_curso";
  }

  return {
    subjectId,
    evaluatedPercentage: weightSum / 100,
    remainingPercentage: remaining / 100,
    accumulatedScore: round2(weighted / 1_000_000),
    currentAverage: weightSum === 0 ? 0 : round2(weighted / weightSum / 100),
    neededToPass,
    minPassingGrade: MIN_PASSING_GRADE,
    status,
  };
};

/**
 * Busca una nota SOLO entre las materias del usuario. Si la nota no existe o su
 * materia es de otro usuario, el resultado es el MISMO 404: así nadie puede
 * descubrir qué IDs existen (defensa contra IDOR)
 */
const findOwnedGrade = (ownedSubjects: Subject[], gradeId: string): Grade => {
  const grade = grades.find((g) => g.id === gradeId);
  if (!grade || !ownedSubjects.some((s) => s.id === grade.subjectId)) {
    throw new HttpError(404, "Calificación no encontrada");
  }
  return grade;
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

  // Consolidado de todas las notas del usuario. Recibe SUS materias (el controller las
  // obtiene): una nota solo se incluye si su materia está en esa lista
  listByUser(subjects: Subject[], filters: ListGradesFilters): ListGradesResponseDto {
    const subjectById = new Map(subjects.map((s) => [s.id, s]));
    const data: GradeListItemDto[] = [];

    for (const g of grades) {
      const subject = subjectById.get(g.subjectId);
      if (!subject) continue; // PRIMERO: la nota debe ser de una materia del usuario
      if (filters.semester !== undefined && subject.semester !== filters.semester) continue;
      if (filters.corte !== undefined && g.corte !== filters.corte) continue; // sin corte: no entra

      data.push({
        id: g.id,
        subjectId: g.subjectId,
        subjectName: subject.name, // se toma de la materia: refleja renombres
        title: g.title,
        score: g.score,
        weight: g.weight,
        corte: g.corte,
        date: g.date,
      });
    }

    // Más reciente primero; si coincide la fecha, por materia y luego por título
    data.sort(
      (a, b) =>
        Date.parse(b.date) - Date.parse(a.date) ||
        a.subjectName.localeCompare(b.subjectName, "es") ||
        a.title.localeCompare(b.title, "es"),
    );

    return { data };
  },

  getProgress(subject: Subject): SubjectProgressDto {
    return buildProgress(subject.id, gradesOf(subject.id));
  },

  // Borrado en cascada: elimina todas las notas de una materia y devuelve cuántas fueron.
  // La materia ya viene validada (propiedad comprobada) por quien llama
  deleteBySubject(subjectId: string): number {
    const before = grades.length;
    grades = grades.filter((g) => g.subjectId !== subjectId);
    return before - grades.length;
  },

  // Recibe SUS materias (el controller las obtiene) para comprobar la propiedad de la nota
  updateGrade(ownedSubjects: Subject[], gradeId: string, dto: UpdateGradeDto): UpdateGradeResponseDto {
    const grade = findOwnedGrade(ownedSubjects, gradeId); // 404 si no existe o no es suya

    if (dto.weight !== undefined) {
      // Porcentaje que ocupan las OTRAS notas de la materia (se excluye la que se edita)
      const othersHundredths = gradesOf(grade.subjectId)
        .filter((g) => g.id !== grade.id)
        .reduce((sum, g) => sum + toHundredths(g.weight), 0);

      if (othersHundredths + toHundredths(dto.weight) > TOTAL_HUNDREDTHS) {
        const available = (TOTAL_HUNDREDTHS - othersHundredths) / 100;
        throw new HttpError(400, "Datos inválidos", [
          `La suma de porcentajes supera el 100%: las demás notas suman ${othersHundredths / 100}% y solo quedan ${available}% disponibles`,
        ]);
      }
    }

    // Todas las reglas pasaron: recién ahora se modifica (todo o nada)
    if (dto.title !== undefined) grade.title = dto.title;
    if (dto.score !== undefined) grade.score = dto.score;
    if (dto.weight !== undefined) grade.weight = dto.weight;
    if (dto.corte !== undefined) {
      if (dto.corte === null) delete grade.corte; // null quita el corte
      else grade.corte = dto.corte;
    }
    if (dto.date !== undefined) grade.date = dto.date;

    return { message: "Calificación actualizada", grade: { ...grade } };
  },

  deleteGrade(ownedSubjects: Subject[], gradeId: string): DeleteGradeResponseDto {
    const grade = findOwnedGrade(ownedSubjects, gradeId); // 404 si no existe o no es suya

    grades = grades.filter((g) => g.id !== grade.id);

    return {
      message: "Calificación eliminada correctamente",
      deletedId: grade.id,
      subjectId: grade.subjectId,
      // El promedio se calcula al consultar, así que ya refleja el borrado
      gradesSummary: summarize(gradesOf(grade.subjectId)),
    };
  },

  // Promedio general ponderado por créditos (PGA) de las materias del usuario.
  // Solo cuentan las materias que ya tienen al menos una nota
  getAverage(ownedSubjects: Subject[], filters: GradesAverageFilters): GradesAverageResponseDto {
    const inScope = ownedSubjects.filter(
      (s) => filters.semester === undefined || s.semester === filters.semester,
    );

    const bySubject: SubjectAverageDto[] = [];
    let approvedSubjects = 0;
    let atRiskSubjects = 0;
    let ungradedSubjects = 0;
    let totalCredits = 0;
    let weightedHundredths = 0; // Σ promedio (en centésimas) × créditos

    for (const subject of inScope) {
      const subjectGrades = gradesOf(subject.id);
      if (subjectGrades.length === 0) {
        ungradedSubjects++; // sin notas no hay promedio: no entra al PGA
        continue;
      }

      const progress = buildProgress(subject.id, subjectGrades);
      const approved = progress.status === "aprobada" || progress.status === "aprobacion_asegurada";
      if (approved) approvedSubjects++;
      else if (progress.currentAverage < MIN_PASSING_GRADE) atRiskSubjects++;

      // El PGA se calcula con los promedios REDONDEADOS que ve el usuario,
      // así el resultado se puede comprobar a mano con la lista
      weightedHundredths += Math.round(progress.currentAverage * 100) * subject.credits;
      totalCredits += subject.credits;

      bySubject.push({
        subjectId: subject.id,
        name: subject.name,
        average: progress.currentAverage,
        credits: subject.credits,
        semester: subject.semester,
        status: progress.status,
      });
    }

    bySubject.sort((a, b) => a.semester - b.semester || a.name.localeCompare(b.name, "es"));

    return {
      // Sin materias con notas no hay promedio (división por cero): se devuelve null
      pga: totalCredits === 0 ? null : Math.round(weightedHundredths / totalCredits) / 100,
      totalCredits,
      approvedSubjects,
      atRiskSubjects,
      ungradedSubjects,
      bySubject,
    };
  },
};
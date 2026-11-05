import { randomUUID } from "node:crypto";
import {
  CreateSubjectDto,
  CreateSubjectResponseDto,
  ListSubjectsFilters,
  ListSubjectsResponseDto,
  SubjectListItemDto,
  SubjectResponseDto,
} from "../models/subject.dto";
import { Subject } from "../models/subject.model";
import { HttpError } from "../utils/http-error";

// ---- Almacenamiento en memoria (no hay base de datos) ----
// Los datos se pierden al reiniciar el servidor
const subjects: Subject[] = [];

const DEFAULT_COLOR = "#3B82F6";

// Para comparar sin importar mayúsculas ni espacios en los bordes
const normalize = (text: string): string => text.trim().toLowerCase();

// Para buscar: además quita los acentos ("Cálculo" -> "calculo")
const fold = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const toSubjectResponse = ({ userId, createdAt, schedule, ...rest }: Subject): SubjectResponseDto => ({
  ...rest,
  schedule: schedule.map((block) => ({ ...block })), // copia: nadie modifica lo guardado
});

const toSubjectListItem = (s: Subject): SubjectListItemDto => ({
  id: s.id,
  name: s.name,
  code: s.code,
  credits: s.credits,
  semester: s.semester,
  status: s.status,
  teacher: s.teacher,
  color: s.color,
  // TODO: calcular con las notas cuando exista el módulo de calificaciones
  currentAverage: 0,
});

export const subjectService = {
  createSubject(userId: number, dto: CreateSubjectDto): CreateSubjectResponseDto {
    // Solo se comparan las materias de ESTE usuario y de ESTE semestre
    const sameSemester = subjects.filter((s) => s.userId === userId && s.semester === dto.semester);

    if (sameSemester.some((s) => normalize(s.code) === normalize(dto.code))) {
      throw new HttpError(409, "Código de materia duplicado");
    }
    if (sameSemester.some((s) => normalize(s.name) === normalize(dto.name))) {
      throw new HttpError(409, "Nombre de materia duplicado");
    }

    const subject: Subject = {
      id: randomUUID(),
      userId, // viene del token, nunca del body
      name: dto.name,
      code: dto.code,
      credits: dto.credits,
      semester: dto.semester,
      teacher: dto.teacher ?? "",
      color: dto.color ?? DEFAULT_COLOR,
      status: "cursando", // toda materia nueva se está cursando
      schedule: dto.schedule ?? [],
      createdAt: new Date(),
    };
    subjects.push(subject);

    return { message: "Materia creada", subject: toSubjectResponse(subject) };
  },

  listSubjects(userId: number, filters: ListSubjectsFilters): ListSubjectsResponseDto {
    const term = filters.search ? fold(filters.search) : undefined;

    const data = subjects
      .filter((s) => s.userId === userId) // PRIMERO: solo las materias del usuario
      .filter((s) => filters.semester === undefined || s.semester === filters.semester)
      .filter((s) => filters.status === undefined || s.status === filters.status)
      .filter((s) => term === undefined || fold(s.name).includes(term) || fold(s.code).includes(term))
      // filter() devuelve un arreglo nuevo, así que ordenar no altera el original
      .sort((a, b) => a.semester - b.semester || a.name.localeCompare(b.name, "es"))
      .map(toSubjectListItem);

    return { data, total: data.length };
  },
};
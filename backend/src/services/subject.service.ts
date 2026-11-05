import { randomUUID } from "node:crypto";
import {
  CreateSubjectDto,
  CreateSubjectResponseDto,
  ListSubjectsFilters,
  ListSubjectsResponseDto,
  SubjectDetailDto,
  SubjectListItemDto,
  SubjectResponseDto,
  SubjectScheduleDto,
  UpdateSubjectDto,
  UpdateSubjectResponseDto,
} from "../models/subject.dto";
import { ScheduleBlock, Subject, WEEK_DAYS } from "../models/subject.model";
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

// Copia del horario ordenada por día (Lunes a Domingo) y luego por hora de inicio
const sortSchedule = (blocks: ScheduleBlock[]): ScheduleBlock[] =>
  blocks
    .map((block) => ({ ...block }))
    .sort(
      (a, b) =>
        WEEK_DAYS.indexOf(a.day) - WEEK_DAYS.indexOf(b.day) ||
        a.startTime.localeCompare(b.startTime),
    );

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

const toSubjectDetail = (s: Subject): SubjectDetailDto => {
  const schedule = sortSchedule(s.schedule);
  return {
    ...toSubjectResponse(s),
    schedule,
    // La sala de la materia se deriva del primer bloque que tenga una
    room: schedule.find((block) => block.room)?.room ?? "",
    // TODO: calcular con las notas cuando exista el módulo de calificaciones
    gradesSummary: { count: 0, totalWeight: 0, weightedAverage: 0 },
  };
};

/**
 * Busca una materia por ID Y por dueño a la vez. Es la defensa contra IDOR:
 * si la materia no existe o es de otro usuario, el resultado es el MISMO 404,
 * para que nadie pueda descubrir qué IDs existen.
 * La reutilizan todos los endpoints que reciben :subjectId.
 */
const getOwnedSubject = (userId: number, subjectId: string): Subject => {
  const subject = subjects.find((s) => s.id === subjectId && s.userId === userId);
  if (!subject) throw new HttpError(404, "Materia no encontrada");
  return subject;
};

export const subjectService = {
  getOwnedSubject,

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

  getSubject(userId: number, subjectId: string): SubjectDetailDto {
    return toSubjectDetail(getOwnedSubject(userId, subjectId));
  },

  updateSubject(userId: number, subjectId: string, dto: UpdateSubjectDto): UpdateSubjectResponseDto {
    const subject = getOwnedSubject(userId, subjectId); // 404 si no existe o no es suya

    // Valores finales: lo enviado o, si no se envió, lo que la materia ya tenía
    const finalName = dto.name ?? subject.name;
    const finalCode = dto.code ?? subject.code;
    const finalSemester = dto.semester ?? subject.semester;

    // Duplicados: se compara con las OTRAS materias del usuario (se excluye la propia),
    // en el semestre final. Así se detecta el choque al cambiar code, name o semester
    const others = subjects.filter(
      (s) => s.userId === userId && s.id !== subject.id && s.semester === finalSemester,
    );
    if (others.some((s) => normalize(s.code) === normalize(finalCode))) {
      throw new HttpError(409, "Código de materia duplicado");
    }
    if (others.some((s) => normalize(s.name) === normalize(finalName))) {
      throw new HttpError(409, "Nombre de materia duplicado");
    }

    // Todas las reglas pasaron: recién ahora se modifica (todo o nada)
    if (dto.name !== undefined) subject.name = dto.name;
    if (dto.code !== undefined) subject.code = dto.code;
    if (dto.credits !== undefined) subject.credits = dto.credits;
    if (dto.semester !== undefined) subject.semester = dto.semester;
    if (dto.teacher !== undefined) subject.teacher = dto.teacher;
    if (dto.color !== undefined) subject.color = dto.color;
    if (dto.schedule !== undefined) subject.schedule = dto.schedule; // reemplaza todo el horario

    return { message: "Materia actualizada", subject: toSubjectResponse(subject) };
  },

  getSchedule(userId: number, subjectId: string): SubjectScheduleDto {
    const subject = getOwnedSubject(userId, subjectId); // 404 si no existe o no es suya

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      // Ordenado por día y hora; room siempre presente ("" si el bloque no tiene sala)
      sessions: sortSchedule(subject.schedule).map((block) => ({
        day: block.day,
        startTime: block.startTime,
        endTime: block.endTime,
        room: block.room ?? "",
      })),
    };
  },
};
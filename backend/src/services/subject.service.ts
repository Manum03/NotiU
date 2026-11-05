import { randomUUID } from "node:crypto";
import { CreateSubjectDto, CreateSubjectResponseDto, SubjectResponseDto } from "../models/subject.dto";
import { Subject } from "../models/subject.model";
import { HttpError } from "../utils/http-error";

// ---- Almacenamiento en memoria ----
// Los datos se pierden al reiniciar el servidor
const subjects: Subject[] = [];

const DEFAULT_COLOR = "#3B82F6";

// Para comparar sin importar mayúsculas ni espacios en los bordes
const normalize = (text: string): string => text.trim().toLowerCase();

const toSubjectResponse = ({ userId, createdAt, schedule, ...rest }: Subject): SubjectResponseDto => ({
  ...rest,
  schedule: schedule.map((block) => ({ ...block })), // copia: nadie modifica lo guardado
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
};
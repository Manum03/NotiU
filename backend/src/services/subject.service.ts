
import { randomUUID } from "node:crypto";
import { db } from "../config/firebase";

import {
  CreateSubjectDto,
  CreateSubjectResponseDto,
  DeleteSubjectResponseDto,
  GradesSummaryDto,
  ListSubjectsFilters,
  ListSubjectsResponseDto,
  SubjectDetailDto,
  SubjectListItemDto,
  SubjectResponseDto,
  SubjectScheduleDto,
  UpdateSubjectDto,
  UpdateSubjectResponseDto,
} from "../models/subject.dto";

import {
  ScheduleBlock,
  Subject,
  WEEK_DAYS,
} from "../models/subject.model";

import { HttpError } from "../utils/http-error";
import { chunk, toDateOrNow } from "../utils/firestore";
import { fold, normalize } from "../utils/text";
import { gradeService } from "./grade.service";
import { noteService } from "./note.service";

// Materias en Firestore: `users/{uid}/subjects/{subjectId}` (el id sigue siendo un UUID).
export const subjectsCol = (userId: string) =>
  db.collection("users").doc(userId).collection("subjects");

const fromDoc = (userId: string, id: string, d: FirebaseFirestore.DocumentData): Subject => ({
  id,
  userId,
  name: String(d.name ?? ""),
  code: String(d.code ?? ""),
  credits: Number(d.credits ?? 0),
  semester: Number(d.semester ?? 1),
  teacher: String(d.teacher ?? ""),
  color: String(d.color ?? DEFAULT_COLOR),
  status: d.status ?? "cursando",
  priority: d.priority ?? "sin_fecha",
  description: String(d.description ?? ""),
  dueDate: d.dueDate ?? null,
  dueTime: d.dueTime ?? null,
  activityType: d.activityType ?? null,
  reminder: d.reminder ?? { enabled: false },
  notes: String(d.notes ?? ""),
  progress: Number(d.progress ?? 0),
  schedule: Array.isArray(d.schedule) ? d.schedule : [],
  createdAt: toDateOrNow(d.createdAt),
});

// El userId va en la ruta del documento, no dentro de él
const toDoc = ({ id: _id, userId: _userId, ...rest }: Subject) => rest;

const loadOwnedSubjects = async (userId: string): Promise<Subject[]> => {
  const snap = await subjectsCol(userId).get();
  return snap.docs.map((doc) => fromDoc(userId, doc.id, doc.data()));
};

const DEFAULT_COLOR = "#800427";

// Copia del horario ordenada por día (Lunes a Domingo) y luego por hora de inicio
const sortSchedule = (blocks: ScheduleBlock[]): ScheduleBlock[] =>
  blocks
    .map((block) => ({ ...block }))
    .sort(
      (a, b) =>
        WEEK_DAYS.indexOf(a.day) - WEEK_DAYS.indexOf(b.day) ||
        a.startTime.localeCompare(b.startTime),
    );

const toSubjectResponse = (
  { userId, createdAt, schedule, reminder, ...rest }: Subject,
): SubjectResponseDto => ({
  ...rest,
  schedule: schedule.map((block) => ({ ...block })),
  reminder: { ...reminder },
});

const toSubjectListItem = (s: Subject, summary: GradesSummaryDto): SubjectListItemDto => ({
  id: s.id,
  name: s.name,
  code: s.code,
  credits: s.credits,
  semester: s.semester,
  status: s.status,
  priority: s.priority,
  teacher: s.teacher,
  color: s.color,

  // Promedio ponderado de las notas registradas (0 si la materia aún no tiene notas)
  currentAverage: summary.weightedAverage,
  progress: s.progress,
  dueDate: s.dueDate,
  dueTime: s.dueTime,
  activityType: s.activityType,
  reminder: s.reminder,
});

const toSubjectDetail = (s: Subject, gradesSummary: GradesSummaryDto): SubjectDetailDto => {
  const schedule = sortSchedule(s.schedule);

  return {
    ...toSubjectResponse(s),
    schedule,
    room: schedule.find((block) => block.room)?.room ?? "",
    gradesSummary, // { count, totalWeight, weightedAverage }
  };
};

// 404 si la materia no existe o no es del usuario (está en SU subcolección)
const getOwnedSubject = async (
  userId: string,
  subjectId: string,
): Promise<Subject> => {
  const snap = await subjectsCol(userId).doc(subjectId).get();

  if (!snap.exists) {
    throw new HttpError(404, "Materia no encontrada");
  }

  return fromDoc(userId, snap.id, snap.data() ?? {});
};

export const subjectService = {
  getOwnedSubject,

  // Materias del usuario, para uso de otros services y controllers.
  // No se envía tal cual al cliente: incluye el userId interno
  getOwnedSubjects: loadOwnedSubjects,

  // Cuántas materias tiene el usuario (estadísticas del perfil)
  async countSubjects(userId: string): Promise<number> {
    const snap = await subjectsCol(userId).count().get();
    return snap.data().count;
  },

  async createSubject(userId: string, dto: CreateSubjectDto): Promise<CreateSubjectResponseDto> {
    // Solo se comparan las materias de ESTE usuario y de ESTE semestre
    const sameSemester = (await loadOwnedSubjects(userId)).filter((s) => s.semester === dto.semester);

    if (
      sameSemester.some(
        (s) => normalize(s.code) === normalize(dto.code),
      )
    ) {
      throw new HttpError(409, "Código de materia duplicado");
    }

    if (
      sameSemester.some(
        (s) => normalize(s.name) === normalize(dto.name),
      )
    ) {
      throw new HttpError(409, "Nombre de materia duplicado");
    }

    const subject: Subject = {
      id: randomUUID(),
      userId,

      name: dto.name,
      code: dto.code,
      credits: dto.credits,
      semester: dto.semester,
      teacher: dto.teacher ?? "",
      color: dto.color ?? DEFAULT_COLOR,

      status: dto.status ?? "cursando",
      priority: dto.priority ?? "sin_fecha",

      description: dto.description ?? "",
      dueDate: dto.dueDate ?? null,
      dueTime: dto.dueTime ?? null,
      activityType: dto.activityType ?? null,

      reminder: dto.reminder
        ? { ...dto.reminder }
        : { enabled: false },

      notes: dto.notes ?? "",
      progress: dto.progress ?? 0,

      schedule: dto.schedule ?? [],
      createdAt: new Date(),
    };

    await subjectsCol(userId).doc(subject.id).set(toDoc(subject));

    return {
      message: "Materia creada",
      subject: toSubjectResponse(subject),
    };
  },

  async listSubjects(
    userId: string,
    filters: ListSubjectsFilters,
  ): Promise<ListSubjectsResponseDto> {
    const term = filters.search
      ? fold(filters.search)
      : undefined;

    // Una sola lectura de notas para calcular el promedio de todas las materias
    const [owned, summaries] = await Promise.all([
      loadOwnedSubjects(userId),
      gradeService.getSummariesByUser(userId),
    ]);

    const data = owned
      .filter(
        (s) =>
          filters.semester === undefined ||
          s.semester === filters.semester,
      )
      .filter(
        (s) =>
          filters.status === undefined ||
          s.status === filters.status,
      )
      .filter(
        (s) =>
          filters.priority === undefined ||
          s.priority === filters.priority,
      )
      .filter(
        (s) =>
          term === undefined ||
          fold(s.name).includes(term) ||
          fold(s.code).includes(term),
      )
      .sort(
        (a, b) =>
          a.semester - b.semester ||
          a.name.localeCompare(b.name, "es"),
      )
      .map((s) => toSubjectListItem(s, summaries.get(s.id) ?? gradeService.emptySummary()));

    return {
      data,
      total: data.length,
    };
  },

  async getSubject(
    userId: string,
    subjectId: string,
  ): Promise<SubjectDetailDto> {
    const subject = await getOwnedSubject(userId, subjectId);
    return toSubjectDetail(subject, await gradeService.getSummary(userId, subject.id));
  },

  async updateSubject(
    userId: string,
    subjectId: string,
    dto: UpdateSubjectDto,
  ): Promise<UpdateSubjectResponseDto> {
    const owned = await loadOwnedSubjects(userId);
    const subject = owned.find((s) => s.id === subjectId);
    if (!subject) throw new HttpError(404, "Materia no encontrada");

    const finalName = dto.name ?? subject.name;
    const finalCode = dto.code ?? subject.code;
    const finalSemester = dto.semester ?? subject.semester;

    const others = owned.filter(
      (s) =>
        s.id !== subject.id &&
        s.semester === finalSemester,
    );

    if (
      others.some(
        (s) => normalize(s.code) === normalize(finalCode),
      )
    ) {
      throw new HttpError(409, "Código de materia duplicado");
    }

    if (
      others.some(
        (s) => normalize(s.name) === normalize(finalName),
      )
    ) {
      throw new HttpError(409, "Nombre de materia duplicado");
    }

    if (dto.name !== undefined) subject.name = dto.name;
    if (dto.code !== undefined) subject.code = dto.code;
    if (dto.credits !== undefined) subject.credits = dto.credits;
    if (dto.semester !== undefined) subject.semester = dto.semester;
    if (dto.teacher !== undefined) subject.teacher = dto.teacher;
    if (dto.color !== undefined) subject.color = dto.color;

    if (dto.schedule !== undefined) {
      subject.schedule = dto.schedule;
    }

    if (dto.status !== undefined) subject.status = dto.status;
    if (dto.priority !== undefined) subject.priority = dto.priority;

    if (dto.description !== undefined) {
      subject.description = dto.description;
    }

    if (dto.dueDate !== undefined) {
      subject.dueDate = dto.dueDate;
    }

    if (dto.dueTime !== undefined) {
      subject.dueTime = dto.dueTime;
    }

    if (dto.activityType !== undefined) {
      subject.activityType = dto.activityType;
    }

    if (dto.reminder !== undefined) {
      subject.reminder = { ...dto.reminder };
    }

    if (dto.notes !== undefined) {
      subject.notes = dto.notes;
    }

    if (dto.progress !== undefined) {
      subject.progress = dto.progress;
    }

    await subjectsCol(userId).doc(subject.id).set(toDoc(subject));

    return {
      message: "Materia actualizada",
      subject: toSubjectResponse(subject),
    };
  },

  async getSchedule(
    userId: string,
    subjectId: string,
  ): Promise<SubjectScheduleDto> {
    const subject = await getOwnedSubject(userId, subjectId);

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      sessions: sortSchedule(subject.schedule).map(
        (block) => ({
          day: block.day,
          startTime: block.startTime,
          endTime: block.endTime,
          room: block.room ?? "",
        }),
      ),
    };
  },

  // Borrado físico y en cascada: elimina las notas de la materia y luego la materia.
  // Es irreversible. Los apuntes que la referencien no se borran: quedan con subjectId = null
  async deleteSubject(userId: string, subjectId: string): Promise<DeleteSubjectResponseDto> {
    const subject = await getOwnedSubject(userId, subjectId); // 404 si no existe o no es suya

    const [gradeRefs, noteRefs] = await Promise.all([
      gradeService.refsBySubject(userId, subject.id),
      noteService.refsBySubject(userId, subject.id),
    ]);

    // Todo en batch (máx. 500 operaciones cada uno). La materia se borra en el último
    // batch: si algo falla antes, la materia sigue ahí y se puede volver a intentar
    const ops: ((batch: FirebaseFirestore.WriteBatch) => void)[] = [
      ...gradeRefs.map((ref) => (batch: FirebaseFirestore.WriteBatch) => void batch.delete(ref)),
      ...noteRefs.map((ref) => (batch: FirebaseFirestore.WriteBatch) => void batch.update(ref, { subjectId: null })),
      (batch: FirebaseFirestore.WriteBatch) => void batch.delete(subjectsCol(userId).doc(subject.id)),
    ];
    for (const group of chunk(ops, 500)) {
      const batch = db.batch();
      group.forEach((op) => op(batch));
      await batch.commit();
    }
    const deletedGrades = gradeRefs.length;

    return {
      message: "Materia y registros asociados eliminados",
      deletedId: subject.id,
      deletedGrades,
    };
  },
};

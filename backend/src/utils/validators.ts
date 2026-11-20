import { ChangePasswordDto, LoginDto, RegisterDto } from "../models/auth.dto";
import { UserRole } from "../models/user.model";
import { HttpError } from "./http-error";
import { UpdateProfileDto } from "../models/profile.dto";
import { UpdateSettingsDto } from "../models/settings.dto";
import { THEMES, Theme } from "../models/settings.model";
import { CreateSubjectDto,ListSubjectsFilters,UpdateSubjectDto,} from "../models/subject.dto";
import {ScheduleBlock,WEEK_DAYS,WeekDay,SUBJECT_STATUSES,SUBJECT_PRIORITIES,ACTIVITY_TYPES,SubjectStatus,SubjectPriority,ActivityType,SubjectReminder,} from "../models/subject.model";
import { CreateGradeDto, GradesAverageFilters, ListGradesFilters, UpdateGradeDto } from "../models/grade.dto";
import { CORTES, Corte } from "../models/grade.model";
import { CreateNoteDto, ListNotesFilters, UpdateNoteDto } from "../models/note.dto";
import {CreateConnectionRequestDto,ListConnectionsFilters,ListPeersFilters,RespondConnectionRequestDto,} from "../models/connection.dto";
import { CONNECTION_ACTIONS, ConnectionAction } from "../models/connection.model";
import { CreateStudyGroupDto, ListStudyGroupsFilters } from "../models/study-group.dto";
import { MAX_GROUP_MEMBERS, MIN_GROUP_MEMBERS } from "../models/study-group.model";
import { randomUUID } from "crypto";
import { CreateTaskDto, TaskListQueryDto, UpdateTaskDto } from "../models/task.dto";
import {
  TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES,
  TaskPriority, TaskStatus, TaskSubtask, TaskType,
} from "../models/task.model";
import { ListTipsFilters } from "../models/tip.dto";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES: UserRole[] = ["student", "teacher", "admin"];
const MIN_PASSWORD = 8;

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const ensureObject = (body: unknown): Record<string, unknown> => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "El cuerpo de la petición debe ser un objeto JSON");
  }
  return body as Record<string, unknown>;
};

const fail = (errors: string[]): void => {
  if (errors.length > 0) throw new HttpError(400, "Datos inválidos", errors);
};

const checkPassword = (value: unknown, field: string, errors: string[]): void => {
  if (!isNonEmptyString(value)) {
    errors.push(`${field} es obligatorio`);
  } else if (value.length < MIN_PASSWORD) {
    errors.push(`${field} debe tener al menos ${MIN_PASSWORD} caracteres`);
  }
};

export const validateRegister = (body: unknown): RegisterDto => {
  const b = ensureObject(body);
  const errors: string[] = [];

  if (!isNonEmptyString(b.name)) errors.push("name es obligatorio");
  if (!isNonEmptyString(b.email) || !EMAIL_REGEX.test(b.email)) {
    errors.push("email debe ser un correo válido");
  }
  checkPassword(b.password, "password", errors);
  if (b.role !== undefined && !ROLES.includes(b.role as UserRole)) {
    errors.push(`role debe ser uno de: ${ROLES.join(", ")}`);
  }
  fail(errors);

  return {
    name: (b.name as string).trim(),
    email: (b.email as string).trim().toLowerCase(),
    password: b.password as string,
    role: b.role as UserRole | undefined,
  };
};

export const validateLogin = (body: unknown): LoginDto => {
  const b = ensureObject(body);
  const errors: string[] = [];

  if (!isNonEmptyString(b.email)) errors.push("email es obligatorio");
  if (!isNonEmptyString(b.password)) errors.push("password es obligatorio");
  fail(errors);

  return {
    email: (b.email as string).trim().toLowerCase(),
    password: b.password as string,
  };
};

export const validateChangePassword = (body: unknown): ChangePasswordDto => {
  const b = ensureObject(body);
  const errors: string[] = [];

  if (!isNonEmptyString(b.currentPassword)) errors.push("currentPassword es obligatorio");
  checkPassword(b.newPassword, "newPassword", errors);
  if (errors.length === 0 && b.currentPassword === b.newPassword) {
    errors.push("newPassword debe ser diferente a currentPassword");
  }
  fail(errors);

  return {
    currentPassword: b.currentPassword as string,
    newPassword: b.newPassword as string,
  };
};

// ---- Perfil ----
const MAX_NAME = 100;
const MAX_BIO = 300;
const MAX_CAREER = 100;
const MAX_URL = 500;
const MAX_INTERESTS = 20;
const MAX_INTEREST_LENGTH = 50;

const isHttpUrl = (v: unknown): v is string => {
  if (typeof v !== "string" || v.length > MAX_URL) return false;
  try {
    const url = new URL(v);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const validateUpdateProfile = (body: unknown): UpdateProfileDto => {
  const b = ensureObject(body);
  const errors: string[] = [];
  const dto: UpdateProfileDto = {};

  if (b.name !== undefined) {
    if (!isNonEmptyString(b.name) || b.name.trim().length > MAX_NAME) {
      errors.push(`name debe ser un texto de 1 a ${MAX_NAME} caracteres`);
    } else dto.name = b.name.trim();
  }

  if (b.bio !== undefined) {
    if (typeof b.bio !== "string" || b.bio.length > MAX_BIO) {
      errors.push(`bio debe ser un texto de máximo ${MAX_BIO} caracteres`);
    } else dto.bio = b.bio.trim();
  }

  if (b.career !== undefined) {
    if (typeof b.career !== "string" || b.career.length > MAX_CAREER) {
      errors.push(`career debe ser un texto de máximo ${MAX_CAREER} caracteres`);
    } else dto.career = b.career.trim();
  }

  if (b.semester !== undefined) {
    const s = b.semester;
    if (typeof s !== "number" || !Number.isInteger(s) || s < 1 || s > 12) {
      errors.push("Semestre fuera de rango (1-12)");
    } else dto.semester = s;
  }

  if (b.avatarUrl !== undefined) {
    if (!isHttpUrl(b.avatarUrl)) {
      errors.push("avatarUrl debe ser una URL http o https válida");
    } else dto.avatarUrl = b.avatarUrl;
  }

  if (b.interests !== undefined) {
    const list = b.interests;
    if (
      !Array.isArray(list) ||
      list.length > MAX_INTERESTS ||
      !list.every((i) => isNonEmptyString(i) && i.trim().length <= MAX_INTEREST_LENGTH)
    ) {
      errors.push(
        `interests debe ser un arreglo de máximo ${MAX_INTERESTS} textos de 1 a ${MAX_INTEREST_LENGTH} caracteres`,
      );
    } else dto.interests = list.map((i) => (i as string).trim());
  }

  fail(errors);

  // Regla del inventario: al menos un campo (los campos desconocidos no cuentan)
  if (Object.keys(dto).length === 0) {
    throw new HttpError(400, "Datos inválidos", [
      "Debes enviar al menos un campo: name, bio, career, semester, avatarUrl o interests",
    ]);
  }

  return dto;
};

// ---- Ajustes ----
const NOTIFICATION_KEYS = ["email", "push", "studyReminders"] as const;
const PRIVACY_KEYS = ["showProfileToPeers"] as const;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const validateUpdateSettings = (body: unknown): UpdateSettingsDto => {
  const b = ensureObject(body);
  const errors: string[] = [];
  const dto: UpdateSettingsDto = {};

  if (b.theme !== undefined) {
    if (typeof b.theme !== "string" || !THEMES.includes(b.theme as Theme)) {
      errors.push("Valor de theme no permitido");
    } else dto.theme = b.theme as Theme;
  }

  if (b.notifications !== undefined) {
    if (!isPlainObject(b.notifications)) {
      errors.push("notifications debe ser un objeto");
    } else {
      const input = b.notifications;
      const parsed: NonNullable<UpdateSettingsDto["notifications"]> = {};
      for (const key of NOTIFICATION_KEYS) {
        if (input[key] === undefined) continue; // solo se leen las llaves permitidas
        if (typeof input[key] !== "boolean") {
          errors.push(`notifications.${key} debe ser true o false`);
        } else parsed[key] = input[key] as boolean;
      }
      if (Object.keys(parsed).length > 0) dto.notifications = parsed;
    }
  }

  if (b.privacy !== undefined) {
    if (!isPlainObject(b.privacy)) {
      errors.push("privacy debe ser un objeto");
    } else {
      const input = b.privacy;
      const parsed: NonNullable<UpdateSettingsDto["privacy"]> = {};
      for (const key of PRIVACY_KEYS) {
        if (input[key] === undefined) continue;
        if (typeof input[key] !== "boolean") {
          errors.push(`privacy.${key} debe ser true o false`);
        } else parsed[key] = input[key] as boolean;
      }
      if (Object.keys(parsed).length > 0) dto.privacy = parsed;
    }
  }

  fail(errors);

  if (dto.theme === undefined && dto.notifications === undefined && dto.privacy === undefined) {
    throw new HttpError(400, "Datos inválidos", [
      "Debes enviar al menos un ajuste: theme, notifications (email, push, studyReminders) o privacy (showProfileToPeers)",
    ]);
  }

  return dto;
};
// ---- Materias ----
const MAX_SUBJECT_NAME = 100;
const MAX_SUBJECT_CODE = 20;
const MAX_TEACHER = 100;
const MAX_ROOM = 30;
const MAX_SCHEDULE_BLOCKS = 14;
const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:mm en 24 horas

// Se exporta porque PATCH /subjects/:id (#15) reutilizará la misma validación
export const parseSchedule = (value: unknown, errors: string[]): ScheduleBlock[] => {
  const errorsBefore = errors.length;
  const blocks: ScheduleBlock[] = [];

  if (!Array.isArray(value) || value.length > MAX_SCHEDULE_BLOCKS) {
    errors.push(`schedule debe ser un arreglo de máximo ${MAX_SCHEDULE_BLOCKS} bloques`);
    return blocks;
  }

  value.forEach((item, i) => {
    const at = `schedule[${i}]`;
    if (!isPlainObject(item)) {
      errors.push(`${at} debe ser un objeto`);
      return;
    }
    const blockErrorsBefore = errors.length;
    const { day, startTime, endTime, room } = item;

    if (typeof day !== "string" || !WEEK_DAYS.includes(day as WeekDay)) {
      errors.push(`${at}.day debe ser uno de: ${WEEK_DAYS.join(", ")}`);
    }
    const startOk = typeof startTime === "string" && TIME_REGEX.test(startTime);
    const endOk = typeof endTime === "string" && TIME_REGEX.test(endTime);
    if (!startOk) errors.push(`${at}.startTime debe tener formato HH:mm (24 horas)`);
    if (!endOk) errors.push(`${at}.endTime debe tener formato HH:mm (24 horas)`);
    if (startOk && endOk && (startTime as string) >= (endTime as string)) {
      errors.push(`${at}: startTime debe ser menor que endTime`);
    }
    if (room !== undefined && (typeof room !== "string" || room.length > MAX_ROOM)) {
      errors.push(`${at}.room debe ser un texto de máximo ${MAX_ROOM} caracteres`);
    }

    // Solo se arma el bloque si este bloque no tuvo errores (lista blanca de campos)
    if (errors.length === blockErrorsBefore) {
      const block: ScheduleBlock = {
        day: day as WeekDay,
        startTime: startTime as string,
        endTime: endTime as string,
      };
      const cleanRoom = typeof room === "string" ? room.trim() : "";
      if (cleanRoom) block.room = cleanRoom;
      blocks.push(block);
    }
  });

  // Cruces de horario dentro de la misma materia (solo si todos los bloques eran válidos)
  if (errors.length === errorsBefore) {
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i];
        const b = blocks[j];
        if (a.day === b.day && a.startTime < b.endTime && b.startTime < a.endTime) {
          errors.push(`schedule[${i}] y schedule[${j}] se cruzan el día ${a.day}`);
        }
      }
    }
  }
  return blocks;
};


const MAX_DESCRIPTION = 500;
const MAX_NOTES = 2000;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (value: string): boolean => {
  if (!DATE_REGEX.test(value)) return false;

  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
};

const parseReminder = (
  value: unknown,
  errors: string[],
): SubjectReminder | undefined => {
  if (value === undefined) return undefined;

  if (!isPlainObject(value)) {
    errors.push("reminder debe ser un objeto");
    return undefined;
  }

  const enabled = value.enabled;
  if (typeof enabled !== "boolean") {
    errors.push("reminder.enabled debe ser true o false");
    return undefined;
  }

  const reminder: SubjectReminder = { enabled };

  if (value.dateTime !== undefined) {
    if (
      typeof value.dateTime !== "string" ||
      Number.isNaN(Date.parse(value.dateTime))
    ) {
      errors.push("reminder.dateTime debe ser una fecha y hora válidas");
    } else {
      reminder.dateTime = value.dateTime;
    }
  }

  return reminder;
};

export const validateCreateSubject = (body: unknown): CreateSubjectDto => {
  const b = ensureObject(body);
  const errors: string[] = [];

  if (!isNonEmptyString(b.name) || b.name.trim().length > MAX_SUBJECT_NAME) {
    errors.push(`name es obligatorio (máximo ${MAX_SUBJECT_NAME} caracteres)`);
  }

  if (!isNonEmptyString(b.code) || b.code.trim().length > MAX_SUBJECT_CODE) {
    errors.push(`code es obligatorio (máximo ${MAX_SUBJECT_CODE} caracteres)`);
  }

  if (
    typeof b.credits !== "number" ||
    !Number.isInteger(b.credits) ||
    b.credits < 1 ||
    b.credits > 10
  ) {
    errors.push("Créditos deben ser un número entero entre 1 y 10");
  }

  if (
    typeof b.semester !== "number" ||
    !Number.isInteger(b.semester) ||
    b.semester < 1 ||
    b.semester > 12
  ) {
    errors.push("Semestre fuera de rango (1-12)");
  }

  let teacher: string | undefined;
  if (b.teacher !== undefined) {
    if (typeof b.teacher !== "string" || b.teacher.length > MAX_TEACHER) {
      errors.push(`teacher debe ser un texto de máximo ${MAX_TEACHER} caracteres`);
    } else teacher = b.teacher.trim();
  }

  let color: string | undefined;
  if (b.color !== undefined) {
    if (typeof b.color !== "string" || !HEX_COLOR_REGEX.test(b.color)) {
      errors.push("color debe ser un hexadecimal válido, por ejemplo #3B82F6");
    } else color = b.color;
  }

  let schedule: ScheduleBlock[] | undefined;
  if (b.schedule !== undefined) {
    schedule = parseSchedule(b.schedule, errors);
  }

  let status: SubjectStatus | undefined;
  if (b.status !== undefined) {
    if (
      typeof b.status !== "string" ||
      !SUBJECT_STATUSES.includes(b.status as SubjectStatus)
    ) {
      errors.push(`status debe ser uno de: ${SUBJECT_STATUSES.join(", ")}`);
    } else status = b.status as SubjectStatus;
  }

  let priority: SubjectPriority | undefined;
  if (b.priority !== undefined) {
    if (
      typeof b.priority !== "string" ||
      !SUBJECT_PRIORITIES.includes(b.priority as SubjectPriority)
    ) {
      errors.push(`priority debe ser uno de: ${SUBJECT_PRIORITIES.join(", ")}`);
    } else priority = b.priority as SubjectPriority;
  }

  let description: string | undefined;
  if (b.description !== undefined) {
    if (typeof b.description !== "string" || b.description.length > MAX_DESCRIPTION) {
      errors.push(`description debe tener máximo ${MAX_DESCRIPTION} caracteres`);
    } else description = b.description.trim();
  }

  let dueDate: string | null | undefined;
  if (b.dueDate !== undefined) {
    if (b.dueDate === null) {
      dueDate = null;
    } else if (typeof b.dueDate !== "string" || !isValidDate(b.dueDate)) {
      errors.push("dueDate debe tener formato YYYY-MM-DD o ser null");
    } else dueDate = b.dueDate;
  }

  let dueTime: string | null | undefined;
  if (b.dueTime !== undefined) {
    if (b.dueTime === null) {
      dueTime = null;
    } else if (typeof b.dueTime !== "string" || !TIME_REGEX.test(b.dueTime)) {
      errors.push("dueTime debe tener formato HH:mm o ser null");
    } else dueTime = b.dueTime;
  }

  let activityType: ActivityType | null | undefined;
  if (b.activityType !== undefined) {
    if (b.activityType === null) {
      activityType = null;
    } else if (
      typeof b.activityType !== "string" ||
      !ACTIVITY_TYPES.includes(b.activityType as ActivityType)
    ) {
      errors.push(`activityType debe ser uno de: ${ACTIVITY_TYPES.join(", ")}`);
    } else activityType = b.activityType as ActivityType;
  }

  const reminder = parseReminder(b.reminder, errors);

  let notes: string | undefined;
  if (b.notes !== undefined) {
    if (typeof b.notes !== "string" || b.notes.length > MAX_NOTES) {
      errors.push(`notes debe tener máximo ${MAX_NOTES} caracteres`);
    } else notes = b.notes;
  }

  let progress: number | undefined;
  if (b.progress !== undefined) {
    if (
      typeof b.progress !== "number" ||
      !Number.isInteger(b.progress) ||
      b.progress < 0 ||
      b.progress > 100
    ) {
      errors.push("progress debe ser un número entero entre 0 y 100");
    } else progress = b.progress;
  }

  fail(errors);

  return {
    name: (b.name as string).trim(),
    code: (b.code as string).trim(),
    credits: b.credits as number,
    semester: b.semester as number,
    teacher,
    color,
    schedule,
    status,
    priority,
    description,
    dueDate,
    dueTime,
    activityType,
    reminder,
    notes,
    progress,
  };
};


export const validateListSubjectsQuery = (
  query: unknown,
): ListSubjectsFilters => {
  const q = (query ?? {}) as Record<string, unknown>;
  const errors: string[] = [];
  const filters: ListSubjectsFilters = {};

  const read = (key: string): unknown => {
    const value = q[key];
    return typeof value === "string" && value.trim() === ""
      ? undefined
      : value;
  };

  const semester = read("semester");
  if (semester !== undefined) {
    const n =
      typeof semester === "string" && /^\d{1,2}$/.test(semester.trim())
        ? Number(semester.trim())
        : NaN;

    if (!(n >= 1 && n <= 12)) {
      errors.push("Semestre fuera de rango (1-12)");
    } else {
      filters.semester = n;
    }
  }

  const status = read("status");
  if (status !== undefined) {
    if (
      typeof status !== "string" ||
      !SUBJECT_STATUSES.includes(status.trim() as SubjectStatus)
    ) {
      errors.push(`status debe ser uno de: ${SUBJECT_STATUSES.join(", ")}`);
    } else {
      filters.status = status.trim() as SubjectStatus;
    }
  }

  const priority = read("priority");
  if (priority !== undefined) {
    if (
      typeof priority !== "string" ||
      !SUBJECT_PRIORITIES.includes(priority.trim() as SubjectPriority)
    ) {
      errors.push(`priority debe ser uno de: ${SUBJECT_PRIORITIES.join(", ")}`);
    } else {
      filters.priority = priority.trim() as SubjectPriority;
    }
  }

  const search = read("search");
  if (search !== undefined) {
    if (
      typeof search !== "string" ||
      search.trim().length > MAX_SUBJECT_NAME
    ) {
      errors.push(
        `search debe ser un texto de máximo ${MAX_SUBJECT_NAME} caracteres`,
      );
    } else {
      filters.search = search.trim();
    }
  }

  fail(errors);
  return filters;
};

// ---- ID de materia (parámetro de la URL) ----
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Se exporta porque los demás endpoints con :subjectId (#15 a #18, #20) la reutilizan
export const validateSubjectId = (value: unknown): string => validateUuidParam(value, "subjectId");

// Valida cualquier ID tipo UUID que llegue en la URL (:noteId, :groupId, :tipId, ...)
export const validateUuidParam = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new HttpError(400, "Datos inválidos", [`${field} debe ser un UUID válido`]);
  }
  // randomUUID() genera minúsculas: se normaliza para que la búsqueda siempre coincida
  return value.toLowerCase();
};
// ---- Actualización de materias ----
// Mismas reglas que validateCreateSubject, pero todos los campos son opcionales.
// Se comprueba solo lo que llega: lo que no llega no se toca.

export const validateUpdateSubject = (body: unknown): UpdateSubjectDto => {
  const b = ensureObject(body);
  const errors: string[] = [];
  const dto: UpdateSubjectDto = {};

  if (b.name !== undefined) {
    if (
      !isNonEmptyString(b.name) ||
      b.name.trim().length > MAX_SUBJECT_NAME
    ) {
      errors.push(`name es obligatorio (máximo ${MAX_SUBJECT_NAME} caracteres)`);
    } else {
      dto.name = b.name.trim();
    }
  }

  if (b.code !== undefined) {
    if (
      !isNonEmptyString(b.code) ||
      b.code.trim().length > MAX_SUBJECT_CODE
    ) {
      errors.push(`code es obligatorio (máximo ${MAX_SUBJECT_CODE} caracteres)`);
    } else {
      dto.code = b.code.trim();
    }
  }

  if (b.credits !== undefined) {
    if (
      typeof b.credits !== "number" ||
      !Number.isInteger(b.credits) ||
      b.credits < 1 ||
      b.credits > 10
    ) {
      errors.push("Créditos deben ser un número entero entre 1 y 10");
    } else {
      dto.credits = b.credits;
    }
  }

  if (b.semester !== undefined) {
    if (
      typeof b.semester !== "number" ||
      !Number.isInteger(b.semester) ||
      b.semester < 1 ||
      b.semester > 12
    ) {
      errors.push("Semestre fuera de rango (1-12)");
    } else {
      dto.semester = b.semester;
    }
  }

  if (b.teacher !== undefined) {
    if (typeof b.teacher !== "string" || b.teacher.length > MAX_TEACHER) {
      errors.push(`teacher debe ser un texto de máximo ${MAX_TEACHER} caracteres`);
    } else {
      dto.teacher = b.teacher.trim();
    }
  }

  if (b.color !== undefined) {
    if (typeof b.color !== "string" || !HEX_COLOR_REGEX.test(b.color)) {
      errors.push("color debe ser un hexadecimal válido, por ejemplo #3B82F6");
    } else {
      dto.color = b.color;
    }
  }

  if (b.schedule !== undefined) {
    dto.schedule = parseSchedule(b.schedule, errors);
  }

  if (b.status !== undefined) {
    if (
      typeof b.status !== "string" ||
      !SUBJECT_STATUSES.includes(b.status as SubjectStatus)
    ) {
      errors.push(`status debe ser uno de: ${SUBJECT_STATUSES.join(", ")}`);
    } else {
      dto.status = b.status as SubjectStatus;
    }
  }

  if (b.priority !== undefined) {
    if (
      typeof b.priority !== "string" ||
      !SUBJECT_PRIORITIES.includes(b.priority as SubjectPriority)
    ) {
      errors.push(`priority debe ser uno de: ${SUBJECT_PRIORITIES.join(", ")}`);
    } else {
      dto.priority = b.priority as SubjectPriority;
    }
  }

  if (b.description !== undefined) {
    if (
      typeof b.description !== "string" ||
      b.description.length > MAX_DESCRIPTION
    ) {
      errors.push(`description debe tener máximo ${MAX_DESCRIPTION} caracteres`);
    } else {
      dto.description = b.description.trim();
    }
  }

  if (b.dueDate !== undefined) {
    if (b.dueDate === null) {
      dto.dueDate = null;
    } else if (
      typeof b.dueDate !== "string" ||
      !isValidDate(b.dueDate)
    ) {
      errors.push("dueDate debe tener formato YYYY-MM-DD o ser null");
    } else {
      dto.dueDate = b.dueDate;
    }
  }

  if (b.dueTime !== undefined) {
    if (b.dueTime === null) {
      dto.dueTime = null;
    } else if (
      typeof b.dueTime !== "string" ||
      !TIME_REGEX.test(b.dueTime)
    ) {
      errors.push("dueTime debe tener formato HH:mm o ser null");
    } else {
      dto.dueTime = b.dueTime;
    }
  }

  if (b.activityType !== undefined) {
    if (b.activityType === null) {
      dto.activityType = null;
    } else if (
      typeof b.activityType !== "string" ||
      !ACTIVITY_TYPES.includes(b.activityType as ActivityType)
    ) {
      errors.push(`activityType debe ser uno de: ${ACTIVITY_TYPES.join(", ")}`);
    } else {
      dto.activityType = b.activityType as ActivityType;
    }
  }

  if (b.reminder !== undefined) {
    const reminder = parseReminder(b.reminder, errors);

    if (reminder !== undefined) {
      dto.reminder = reminder;
    }
  }

  if (b.notes !== undefined) {
    if (typeof b.notes !== "string" || b.notes.length > MAX_NOTES) {
      errors.push(`notes debe tener máximo ${MAX_NOTES} caracteres`);
    } else {
      dto.notes = b.notes;
    }
  }

  if (b.progress !== undefined) {
    if (
      typeof b.progress !== "number" ||
      !Number.isInteger(b.progress) ||
      b.progress < 0 ||
      b.progress > 100
    ) {
      errors.push("progress debe ser un número entero entre 0 y 100");
    } else {
      dto.progress = b.progress;
    }
  }

  fail(errors);

  if (Object.keys(dto).length === 0) {
    throw new HttpError(400, "Datos inválidos", [
      "Debes enviar al menos un campo válido para actualizar la materia",
    ]);
  }

  return dto;
};
// ---- Calificaciones ----
const MAX_GRADE_TITLE = 100;
const ISO_DATE_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/;

// true si el número tiene como máximo 2 decimales (tolerando el error de coma flotante)
const hasAtMostTwoDecimals = (n: number): boolean => Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;

// Valida una fecha ISO 8601 ("2026-03-15" o "2026-03-15T10:30:00Z") y que el día exista
const isValidIsoDate = (value: string): boolean => {
  const match = ISO_DATE_REGEX.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2100) return false;

  // Si el día no existe (por ejemplo 2026-02-30), la fecha "se corre" al mes siguiente
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return false;
  }
  return !Number.isNaN(Date.parse(value)); // comprueba también la parte de la hora
};

export const validateCreateGrade = (body: unknown): CreateGradeDto => {
  const b = ensureObject(body);
  const errors: string[] = [];

  if (!isNonEmptyString(b.title) || b.title.trim().length > MAX_GRADE_TITLE) {
    errors.push(`title es obligatorio (máximo ${MAX_GRADE_TITLE} caracteres)`);
  }

  const score = b.score;
  if (score === undefined) {
    errors.push("score es obligatorio");
  } else if (
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 5 ||
    !hasAtMostTwoDecimals(score)
  ) {
    errors.push("Nota fuera de rango (0.0-5.0, máximo 2 decimales)");
  }

  const weight = b.weight;
  if (weight === undefined) {
    errors.push("weight es obligatorio");
  } else if (
    typeof weight !== "number" ||
    !Number.isFinite(weight) ||
    weight < 1 ||
    weight > 100 ||
    !hasAtMostTwoDecimals(weight)
  ) {
    errors.push("Porcentaje fuera de rango (1-100, máximo 2 decimales)");
  }

  let corte: Corte | undefined;
  if (b.corte !== undefined) {
    if (typeof b.corte !== "number" || !CORTES.includes(b.corte as Corte)) {
      errors.push(`corte debe ser uno de: ${CORTES.join(", ")}`);
    } else corte = b.corte as Corte;
  }

  let date: string | undefined;
  if (b.date !== undefined) {
    if (typeof b.date !== "string" || !isValidIsoDate(b.date.trim())) {
      errors.push("date debe ser una fecha ISO 8601 válida, por ejemplo 2026-03-15");
    } else date = b.date.trim();
  }

  fail(errors);

  return {
    title: (b.title as string).trim(),
    score: score as number,
    weight: weight as number,
    corte,
    date,
  };
};
// ---- Consolidado de notas: query params ----
// Un parámetro vacío (?corte=) se trata como "no enviado"
const readQueryText = (q: Record<string, unknown>, key: string): unknown => {
  const v = q[key];
  return typeof v === "string" && v.trim() === "" ? undefined : v;
};

export const validateListGradesQuery = (query: unknown): ListGradesFilters => {
  const q = (query ?? {}) as Record<string, unknown>;
  const errors: string[] = [];
  const filters: ListGradesFilters = {};

  const semester = readQueryText(q, "semester");
  if (semester !== undefined) {
    // Los query params llegan como texto: hay que convertirlos
    const n =
      typeof semester === "string" && /^\d{1,2}$/.test(semester.trim())
        ? Number(semester.trim())
        : NaN;
    if (!(n >= 1 && n <= 12)) errors.push("Semestre fuera de rango (1-12)");
    else filters.semester = n;
  }

  const corte = readQueryText(q, "corte");
  if (corte !== undefined) {
    const n = typeof corte === "string" && /^\d$/.test(corte.trim()) ? Number(corte.trim()) : NaN;
    if (!CORTES.includes(n as Corte)) {
      errors.push(`corte debe ser uno de: ${CORTES.join(", ")}`);
    } else filters.corte = n as Corte;
  }

  fail(errors);
  return filters;
};
// ---- Paginación (query params page y limit) ----
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const readPagination = (
  q: Record<string, unknown>,
  errors: string[],
): { page: number; limit: number } => {
  let page = DEFAULT_PAGE;
  const rawPage = readQueryText(q, "page");
  if (rawPage !== undefined) {
    const n = typeof rawPage === "string" && /^\d{1,6}$/.test(rawPage.trim()) ? Number(rawPage.trim()) : NaN;
    if (!(n >= 1)) errors.push("page debe ser un entero mayor o igual a 1");
    else page = n;
  }

  let limit = DEFAULT_LIMIT;
  const rawLimit = readQueryText(q, "limit");
  if (rawLimit !== undefined) {
    const n = typeof rawLimit === "string" && /^\d{1,3}$/.test(rawLimit.trim()) ? Number(rawLimit.trim()) : NaN;
    if (!(n >= 1 && n <= MAX_LIMIT)) errors.push(`limit debe ser un entero entre 1 y ${MAX_LIMIT}`);
    else limit = n;
  }

  return { page, limit };
};

// Texto libre de búsqueda en query params (?search=, ?tag=, ...)
const readQuerySearch = (
  q: Record<string, unknown>,
  key: string,
  max: number,
  errors: string[],
): string | undefined => {
  const v = readQueryText(q, key);
  if (v === undefined) return undefined;
  if (typeof v !== "string" || v.trim().length > max) {
    errors.push(`${key} debe ser un texto de máximo ${max} caracteres`);
    return undefined;
  }
  return v.trim();
};

// Booleano en query params: solo se aceptan "true" y "false"
const readQueryBoolean = (
  q: Record<string, unknown>,
  key: string,
  errors: string[],
): boolean | undefined => {
  const v = readQueryText(q, key);
  if (v === undefined) return undefined;
  if (v === "true") return true;
  if (v === "false") return false;
  errors.push(`${key} debe ser true o false`);
  return undefined;
};

// ---- Apuntes ----
const MAX_NOTE_TITLE = 150;
const MAX_NOTE_CONTENT = 10000;
const MAX_NOTE_TAGS = 10;
const MAX_TAG_LENGTH = 30;
const MAX_SEARCH = 100;

// Etiquetas: arreglo de textos cortos, sin repetidas (ignorando mayúsculas)
const parseTags = (value: unknown, errors: string[]): string[] => {
  if (
    !Array.isArray(value) ||
    value.length > MAX_NOTE_TAGS ||
    !value.every((t) => isNonEmptyString(t) && t.trim().length <= MAX_TAG_LENGTH)
  ) {
    errors.push(
      `tags debe ser un arreglo de máximo ${MAX_NOTE_TAGS} textos de 1 a ${MAX_TAG_LENGTH} caracteres`,
    );
    return [];
  }
  const tags: string[] = [];
  for (const t of value as string[]) {
    const clean = t.trim();
    if (!tags.some((x) => x.toLowerCase() === clean.toLowerCase())) tags.push(clean);
  }
  return tags;
};

const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_REGEX.test(v);

export const validateListNotesQuery = (query: unknown): ListNotesFilters => {
  const q = (query ?? {}) as Record<string, unknown>;
  const errors: string[] = [];

  let subjectId: string | undefined;
  const rawSubjectId = readQueryText(q, "subjectId");
  if (rawSubjectId !== undefined) {
    if (!isUuid(rawSubjectId)) errors.push("subjectId debe ser un UUID válido");
    else subjectId = rawSubjectId.toLowerCase();
  }

  const tag = readQuerySearch(q, "tag", MAX_TAG_LENGTH, errors);
  const search = readQuerySearch(q, "search", MAX_SEARCH, errors);
  const { page, limit } = readPagination(q, errors);

  fail(errors);
  return { subjectId, tag, search, page, limit };
};

export const validateCreateNote = (body: unknown): CreateNoteDto => {
  const b = ensureObject(body);

  // Regla del inventario: título y contenido obligatorios, con su mensaje propio
  if (!isNonEmptyString(b.title) || !isNonEmptyString(b.content)) {
    throw new HttpError(400, "El título y el contenido son obligatorios");
  }

  const errors: string[] = [];
  if (b.title.trim().length > MAX_NOTE_TITLE) {
    errors.push(`title debe tener de 1 a ${MAX_NOTE_TITLE} caracteres`);
  }
  if (b.content.length > MAX_NOTE_CONTENT) {
    errors.push(`content debe tener máximo ${MAX_NOTE_CONTENT} caracteres`);
  }

  let subjectId: string | undefined;
  if (b.subjectId !== undefined && b.subjectId !== null) {
    if (!isUuid(b.subjectId)) errors.push("subjectId debe ser un UUID válido");
    else subjectId = b.subjectId.toLowerCase();
  }

  let tags: string[] | undefined;
  if (b.tags !== undefined) tags = parseTags(b.tags, errors);

  fail(errors);

  return {
    title: b.title.trim(),
    content: b.content.trim(),
    subjectId,
    tags,
  };
};

export const validateUpdateNote = (body: unknown): UpdateNoteDto => {
  const b = ensureObject(body);
  const errors: string[] = [];
  const dto: UpdateNoteDto = {};

  if (b.title !== undefined) {
    if (!isNonEmptyString(b.title) || b.title.trim().length > MAX_NOTE_TITLE) {
      errors.push(`title no puede estar vacío (máximo ${MAX_NOTE_TITLE} caracteres)`);
    } else dto.title = b.title.trim();
  }

  if (b.content !== undefined) {
    if (!isNonEmptyString(b.content) || b.content.length > MAX_NOTE_CONTENT) {
      errors.push(`content no puede estar vacío (máximo ${MAX_NOTE_CONTENT} caracteres)`);
    } else dto.content = b.content.trim();
  }

  // null desvincula el apunte de su materia
  if (b.subjectId !== undefined) {
    if (b.subjectId === null) dto.subjectId = null;
    else if (!isUuid(b.subjectId)) errors.push("subjectId debe ser un UUID válido o null");
    else dto.subjectId = b.subjectId.toLowerCase();
  }

  // tags REEMPLAZA todas las etiquetas; [] las borra
  if (b.tags !== undefined) dto.tags = parseTags(b.tags, errors);

  if (b.isPinned !== undefined) {
    if (typeof b.isPinned !== "boolean") errors.push("isPinned debe ser true o false");
    else dto.isPinned = b.isPinned;
  }

  fail(errors);

  if (Object.keys(dto).length === 0) {
    throw new HttpError(400, "Datos inválidos", [
      "Debes enviar al menos un campo: title, content, subjectId, tags o isPinned",
    ]);
  }

  return dto;
};

// ---- Conexiones ----
const MAX_CONNECTION_MESSAGE = 200;
const MAX_CAREER_FILTER = 100;

export const validateListPeersQuery = (query: unknown): ListPeersFilters => {
  const q = (query ?? {}) as Record<string, unknown>;
  const errors: string[] = [];

  const career = readQuerySearch(q, "career", MAX_CAREER_FILTER, errors);
  const subjectCode = readQuerySearch(q, "subjectCode", MAX_SUBJECT_CODE, errors);
  const search = readQuerySearch(q, "search", MAX_SEARCH, errors);
  const { page, limit } = readPagination(q, errors);

  fail(errors);
  return { career, subjectCode, search, page, limit };
};

export const validateListConnectionsQuery = (query: unknown): ListConnectionsFilters => {
  const q = (query ?? {}) as Record<string, unknown>;
  const status = readQueryText(q, "status");
  if (status === undefined) return {};
  if (status !== "accepted" && status !== "pending") {
    throw new HttpError(400, "Datos inválidos", ["status debe ser uno de: accepted, pending"]);
  }
  return { status };
};

export const validateCreateConnectionRequest = (body: unknown): CreateConnectionRequestDto => {
  const b = ensureObject(body);
  const errors: string[] = [];

  // Los IDs de usuario se exponen como texto ("2"), pero internamente son números
  const raw = b.targetUserId;
  const targetUserId =
    typeof raw === "string" && /^\d{1,9}$/.test(raw.trim())
      ? Number(raw.trim())
      : typeof raw === "number" && Number.isInteger(raw)
        ? raw
        : NaN;
  if (!(targetUserId >= 1)) errors.push("targetUserId es obligatorio y debe ser un ID de usuario válido");

  let message: string | undefined;
  if (b.message !== undefined) {
    if (typeof b.message !== "string" || b.message.trim().length > MAX_CONNECTION_MESSAGE) {
      errors.push(`message debe ser un texto de máximo ${MAX_CONNECTION_MESSAGE} caracteres`);
    } else message = b.message.trim();
  }

  fail(errors);
  return { targetUserId, message };
};

export const validateRespondConnectionRequest = (body: unknown): RespondConnectionRequestDto => {
  const b = ensureObject(body);
  if (typeof b.action !== "string" || !CONNECTION_ACTIONS.includes(b.action as ConnectionAction)) {
    throw new HttpError(400, "Acción inválida", [
      `action debe ser uno de: ${CONNECTION_ACTIONS.join(", ")}`,
    ]);
  }
  return { action: b.action as ConnectionAction };
};

// ---- Grupos de estudio ----
const MIN_GROUP_NAME = 3;
const MAX_GROUP_NAME = 100;
const MAX_GROUP_DESCRIPTION = 500;
const MAX_GROUP_SCHEDULE = 100;

export const validateListStudyGroupsQuery = (query: unknown): ListStudyGroupsFilters => {
  const q = (query ?? {}) as Record<string, unknown>;
  const errors: string[] = [];

  const subject = readQuerySearch(q, "subject", MAX_SUBJECT_NAME, errors);
  const search = readQuerySearch(q, "search", MAX_SEARCH, errors);
  const onlyMine = readQueryBoolean(q, "onlyMine", errors);

  fail(errors);
  return { subject, search, onlyMine };
};

export const validateCreateStudyGroup = (body: unknown): CreateStudyGroupDto => {
  const b = ensureObject(body);
  const errors: string[] = [];

  if (
    !isNonEmptyString(b.name) ||
    b.name.trim().length < MIN_GROUP_NAME ||
    b.name.trim().length > MAX_GROUP_NAME
  ) {
    errors.push(`name es obligatorio (de ${MIN_GROUP_NAME} a ${MAX_GROUP_NAME} caracteres)`);
  }
  if (!isNonEmptyString(b.subjectName) || b.subjectName.trim().length > MAX_SUBJECT_NAME) {
    errors.push(`subjectName es obligatorio (máximo ${MAX_SUBJECT_NAME} caracteres)`);
  }
  if (!isNonEmptyString(b.description) || b.description.trim().length > MAX_GROUP_DESCRIPTION) {
    errors.push(`description es obligatorio (máximo ${MAX_GROUP_DESCRIPTION} caracteres)`);
  }

  const m = b.maxMembers;
  if (
    typeof m !== "number" ||
    !Number.isInteger(m) ||
    m < MIN_GROUP_MEMBERS ||
    m > MAX_GROUP_MEMBERS
  ) {
    errors.push(`Cupo máximo debe estar entre ${MIN_GROUP_MEMBERS} y ${MAX_GROUP_MEMBERS}`);
  }

  let schedule: string | undefined;
  if (b.schedule !== undefined) {
    if (typeof b.schedule !== "string" || b.schedule.trim().length > MAX_GROUP_SCHEDULE) {
      errors.push(`schedule debe ser un texto de máximo ${MAX_GROUP_SCHEDULE} caracteres`);
    } else schedule = b.schedule.trim() || undefined;
  }

  let meetingLink: string | undefined;
  if (b.meetingLink !== undefined) {
    if (!isHttpUrl(b.meetingLink)) errors.push("meetingLink debe ser una URL http o https válida");
    else meetingLink = b.meetingLink;
  }

  fail(errors);

  return {
    name: (b.name as string).trim(),
    subjectName: (b.subjectName as string).trim(),
    description: (b.description as string).trim(),
    maxMembers: m as number,
    schedule,
    meetingLink,
  };
};

// ---- Tips ----
export const validateListTipsQuery = (query: unknown): ListTipsFilters => {
  const q = (query ?? {}) as Record<string, unknown>;
  const errors: string[] = [];

  const tag = readQuerySearch(q, "tag", MAX_TAG_LENGTH, errors);
  const savedOnly = readQueryBoolean(q, "savedOnly", errors);
  const search = readQuerySearch(q, "search", MAX_SEARCH, errors);
  const { page, limit } = readPagination(q, errors);

  fail(errors);
  return { tag, savedOnly, search, page, limit };
};
// ---- Edición y borrado de notas ----
// ID de la nota (parámetro de la URL)
export const validateGradeId = (value: unknown): string => validateUuidParam(value, "gradeId");

// Mismas reglas que validateCreateGrade, pero todos los campos son opcionales.
// Se comprueba solo lo que llega: lo que no llega no se toca.
export const validateUpdateGrade = (body: unknown): UpdateGradeDto => {
  const b = ensureObject(body);
  const errors: string[] = [];
  const dto: UpdateGradeDto = {};

  if (b.title !== undefined) {
    if (!isNonEmptyString(b.title) || b.title.trim().length > MAX_GRADE_TITLE) {
      errors.push(`title no puede estar vacío (máximo ${MAX_GRADE_TITLE} caracteres)`);
    } else dto.title = b.title.trim();
  }

  if (b.score !== undefined) {
    const s = b.score;
    if (typeof s !== "number" || !Number.isFinite(s) || s < 0 || s > 5 || !hasAtMostTwoDecimals(s)) {
      errors.push("Nota fuera de rango (0.0-5.0, máximo 2 decimales)");
    } else dto.score = s;
  }

  if (b.weight !== undefined) {
    const w = b.weight;
    if (typeof w !== "number" || !Number.isFinite(w) || w < 1 || w > 100 || !hasAtMostTwoDecimals(w)) {
      errors.push("Porcentaje fuera de rango (1-100, máximo 2 decimales)");
    } else dto.weight = w;
  }

  if (b.corte !== undefined) {
    if (b.corte === null) {
      dto.corte = null; // null quita el corte de la nota
    } else if (typeof b.corte !== "number" || !CORTES.includes(b.corte as Corte)) {
      errors.push(`corte debe ser uno de: ${CORTES.join(", ")} (o null para quitarlo)`);
    } else dto.corte = b.corte as Corte;
  }

  if (b.date !== undefined) {
    if (typeof b.date !== "string" || !isValidIsoDate(b.date.trim())) {
      errors.push("date debe ser una fecha ISO 8601 válida, por ejemplo 2026-03-15");
    } else dto.date = b.date.trim();
  }

  fail(errors);

  // Regla: al menos un campo (los desconocidos como id, subjectId o createdAt no cuentan)
  if (Object.keys(dto).length === 0) {
    throw new HttpError(400, "Datos inválidos", [
      "Debes enviar al menos un campo: title, score, weight, corte o date",
    ]);
  }

  return dto;
};

// ---- Promedio general: query params ----
export const validateAverageQuery = (query: unknown): GradesAverageFilters => {
  const q = (query ?? {}) as Record<string, unknown>;
  // Solo importa "semester": se reutiliza la validación del consolidado sin los demás filtros
  const { semester } = validateListGradesQuery({ semester: q.semester });
  return { semester };
};
// ---- Tareas ----
const MAX_TASK_TITLE = 150;
const MAX_TASK_DESCRIPTION = 500;
const MAX_SUBTASKS = 30;
const MAX_SUBTASK_TITLE = 150;

export const validateTaskId = (value: unknown): string => validateUuidParam(value, "taskId");

const parseSubtasks = (value: unknown, errors: string[]): TaskSubtask[] => {
  if (!Array.isArray(value) || value.length > MAX_SUBTASKS) {
    errors.push(`subtasks debe ser un arreglo de máximo ${MAX_SUBTASKS} elementos`);
    return [];
  }
  const subtasks: TaskSubtask[] = [];
  value.forEach((item, i) => {
    const at = `subtasks[${i}]`;
    if (!isPlainObject(item)) {
      errors.push(`${at} debe ser un objeto`);
      return;
    }
    const before = errors.length;
    if (!isNonEmptyString(item.title) || item.title.trim().length > MAX_SUBTASK_TITLE) {
      errors.push(`${at}.title es obligatorio (máximo ${MAX_SUBTASK_TITLE} caracteres)`);
    }
    if (item.completed !== undefined && typeof item.completed !== "boolean") {
      errors.push(`${at}.completed debe ser true o false`);
    }
    if (item.id !== undefined && !isNonEmptyString(item.id)) {
      errors.push(`${at}.id debe ser un texto no vacío`);
    }
    if (errors.length === before) {
      subtasks.push({
        id: typeof item.id === "string" ? item.id.trim() : randomUUID(),
        title: (item.title as string).trim(),
        completed: item.completed === true,
      });
    }
  });
  return subtasks;
};

export const validateCreateTask = (body: unknown): CreateTaskDto => {
  const b = ensureObject(body);
  const errors: string[] = [];

  if (!isNonEmptyString(b.title) || b.title.trim().length > MAX_TASK_TITLE) {
    errors.push(`title es obligatorio (máximo ${MAX_TASK_TITLE} caracteres)`);
  }

  if (typeof b.type !== "string" || !TASK_TYPES.includes(b.type as TaskType)) {
    errors.push(`type es obligatorio y debe ser uno de: ${TASK_TYPES.join(", ")}`);
  }

  if (typeof b.priority !== "string" || !TASK_PRIORITIES.includes(b.priority as TaskPriority)) {
    errors.push(`priority es obligatorio y debe ser uno de: ${TASK_PRIORITIES.join(", ")}`);
  }

  let description: string | undefined;
  if (b.description !== undefined) {
    if (typeof b.description !== "string" || b.description.length > MAX_TASK_DESCRIPTION) {
      errors.push(`description debe tener máximo ${MAX_TASK_DESCRIPTION} caracteres`);
    } else description = b.description.trim();
  }

  let subjectId: string | null | undefined;
  if (b.subjectId !== undefined) {
    if (b.subjectId === null) subjectId = null;
    else if (!isUuid(b.subjectId)) errors.push("subjectId debe ser un UUID válido o null");
    else subjectId = b.subjectId.toLowerCase();
  }

  let dueDate: string | null | undefined;
  if (b.dueDate !== undefined) {
    if (b.dueDate === null) dueDate = null;
    else if (typeof b.dueDate !== "string" || !isValidDate(b.dueDate)) {
      errors.push("dueDate debe tener formato YYYY-MM-DD o ser null");
    } else dueDate = b.dueDate;
  }

  let dueTime: string | null | undefined;
  if (b.dueTime !== undefined) {
    if (b.dueTime === null) dueTime = null;
    else if (typeof b.dueTime !== "string" || !TIME_REGEX.test(b.dueTime)) {
      errors.push("dueTime debe tener formato HH:mm o ser null");
    } else dueTime = b.dueTime;
  }

  let subtasks: TaskSubtask[] | undefined;
  if (b.subtasks !== undefined) subtasks = parseSubtasks(b.subtasks, errors);

  fail(errors);

  return {
    title: (b.title as string).trim(),
    description,
    type: b.type as TaskType,
    priority: b.priority as TaskPriority,
    subjectId,
    dueDate,
    dueTime,
    subtasks,
  };
};

// Mismas reglas que validateCreateTask, pero todo es opcional y se agrega status.
export const validateUpdateTask = (body: unknown): UpdateTaskDto => {
  const b = ensureObject(body);
  const errors: string[] = [];
  const dto: UpdateTaskDto = {};

  if (b.title !== undefined) {
    if (!isNonEmptyString(b.title) || b.title.trim().length > MAX_TASK_TITLE) {
      errors.push(`title no puede estar vacío (máximo ${MAX_TASK_TITLE} caracteres)`);
    } else dto.title = b.title.trim();
  }

  if (b.description !== undefined) {
    if (typeof b.description !== "string" || b.description.length > MAX_TASK_DESCRIPTION) {
      errors.push(`description debe tener máximo ${MAX_TASK_DESCRIPTION} caracteres`);
    } else dto.description = b.description.trim();
  }

  if (b.type !== undefined) {
    if (typeof b.type !== "string" || !TASK_TYPES.includes(b.type as TaskType)) {
      errors.push(`type debe ser uno de: ${TASK_TYPES.join(", ")}`);
    } else dto.type = b.type as TaskType;
  }

  if (b.status !== undefined) {
    if (typeof b.status !== "string" || !TASK_STATUSES.includes(b.status as TaskStatus)) {
      errors.push(`status debe ser uno de: ${TASK_STATUSES.join(", ")}`);
    } else dto.status = b.status as TaskStatus;
  }

  if (b.priority !== undefined) {
    if (typeof b.priority !== "string" || !TASK_PRIORITIES.includes(b.priority as TaskPriority)) {
      errors.push(`priority debe ser uno de: ${TASK_PRIORITIES.join(", ")}`);
    } else dto.priority = b.priority as TaskPriority;
  }

  if (b.subjectId !== undefined) {
    if (b.subjectId === null) dto.subjectId = null;
    else if (!isUuid(b.subjectId)) errors.push("subjectId debe ser un UUID válido o null");
    else dto.subjectId = b.subjectId.toLowerCase();
  }

  if (b.dueDate !== undefined) {
    if (b.dueDate === null) dto.dueDate = null;
    else if (typeof b.dueDate !== "string" || !isValidDate(b.dueDate)) {
      errors.push("dueDate debe tener formato YYYY-MM-DD o ser null");
    } else dto.dueDate = b.dueDate;
  }

  if (b.dueTime !== undefined) {
    if (b.dueTime === null) dto.dueTime = null;
    else if (typeof b.dueTime !== "string" || !TIME_REGEX.test(b.dueTime)) {
      errors.push("dueTime debe tener formato HH:mm o ser null");
    } else dto.dueTime = b.dueTime;
  }

  if (b.subtasks !== undefined) dto.subtasks = parseSubtasks(b.subtasks, errors);

  fail(errors);

  if (Object.keys(dto).length === 0) {
    throw new HttpError(400, "Datos inválidos", [
      "Debes enviar al menos un campo: title, description, type, status, priority, subjectId, dueDate, dueTime o subtasks",
    ]);
  }

  return dto;
};

export const validateListTasksQuery = (query: unknown): TaskListQueryDto => {
  const q = (query ?? {}) as Record<string, unknown>;
  const errors: string[] = [];
  const filters: TaskListQueryDto = {};

  const status = readQueryText(q, "status");
  if (status !== undefined) {
    if (typeof status !== "string" || !TASK_STATUSES.includes(status.trim() as TaskStatus)) {
      errors.push(`status debe ser uno de: ${TASK_STATUSES.join(", ")}`);
    } else filters.status = status.trim() as TaskStatus;
  }

  const type = readQueryText(q, "type");
  if (type !== undefined) {
    if (typeof type !== "string" || !TASK_TYPES.includes(type.trim() as TaskType)) {
      errors.push(`type debe ser uno de: ${TASK_TYPES.join(", ")}`);
    } else filters.type = type.trim() as TaskType;
  }

  const priority = readQueryText(q, "priority");
  if (priority !== undefined) {
    if (typeof priority !== "string" || !TASK_PRIORITIES.includes(priority.trim() as TaskPriority)) {
      errors.push(`priority debe ser uno de: ${TASK_PRIORITIES.join(", ")}`);
    } else filters.priority = priority.trim() as TaskPriority;
  }

  const subjectId = readQueryText(q, "subjectId");
  if (subjectId !== undefined) {
    if (!isUuid(subjectId)) errors.push("subjectId debe ser un UUID válido");
    else filters.subjectId = subjectId.toLowerCase();
  }

  const dueDate = readQueryText(q, "dueDate");
  if (dueDate !== undefined) {
    if (typeof dueDate !== "string" || !isValidDate(dueDate.trim())) {
      errors.push("dueDate debe tener formato YYYY-MM-DD");
    } else filters.dueDate = dueDate.trim();
  }

  const search = readQuerySearch(q, "search", MAX_SEARCH, errors);
  if (search !== undefined) filters.search = search;

  fail(errors);
  return filters;
};
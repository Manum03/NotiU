import { ChangePasswordDto, LoginDto, RegisterDto } from "../models/auth.dto";
import { UserRole } from "../models/user.model";
import { HttpError } from "./http-error";
import { UpdateProfileDto } from "../models/profile.dto";
import { UpdateSettingsDto } from "../models/settings.dto";
import { THEMES, Theme } from "../models/settings.model";
import { CreateSubjectDto } from "../models/subject.dto";
import { ScheduleBlock, WEEK_DAYS, WeekDay } from "../models/subject.model";
import { ListSubjectsFilters } from "../models/subject.dto";
import { SUBJECT_STATUSES, SubjectStatus } from "../models/subject.model";
import { UpdateSubjectDto } from "../models/subject.dto";

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

export const validateCreateSubject = (body: unknown): CreateSubjectDto => {
  const b = ensureObject(body);
  const errors: string[] = [];

  if (!isNonEmptyString(b.name) || b.name.trim().length > MAX_SUBJECT_NAME) {
    errors.push(`name es obligatorio (máximo ${MAX_SUBJECT_NAME} caracteres)`);
  }
  if (!isNonEmptyString(b.code) || b.code.trim().length > MAX_SUBJECT_CODE) {
    errors.push(`code es obligatorio (máximo ${MAX_SUBJECT_CODE} caracteres)`);
  }

  const c = b.credits;
  if (typeof c !== "number" || !Number.isInteger(c) || c < 1 || c > 10) {
    errors.push("Créditos deben ser un número entero entre 1 y 10");
  }

  const s = b.semester;
  if (s === undefined) {
    errors.push("semester es obligatorio");
  } else if (typeof s !== "number" || !Number.isInteger(s) || s < 1 || s > 12) {
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
  if (b.schedule !== undefined) schedule = parseSchedule(b.schedule, errors);

  fail(errors);

  return {
    name: (b.name as string).trim(),
    code: (b.code as string).trim(),
    credits: b.credits as number,
    semester: b.semester as number,
    teacher,
    color,
    schedule,
  };
};
// ---- Listado de materias: query params ----
export const validateListSubjectsQuery = (query: unknown): ListSubjectsFilters => {
  const q = (query ?? {}) as Record<string, unknown>;
  const errors: string[] = [];
  const filters: ListSubjectsFilters = {};

  // Un parámetro vacío (?search=) se trata como "no enviado"
  const read = (key: string): unknown => {
    const v = q[key];
    return typeof v === "string" && v.trim() === "" ? undefined : v;
  };

  const semester = read("semester");
  if (semester !== undefined) {
    // Los query params llegan como texto: hay que convertirlos
    const n =
      typeof semester === "string" && /^\d{1,2}$/.test(semester.trim())
        ? Number(semester.trim())
        : NaN;
    if (!(n >= 1 && n <= 12)) errors.push("Semestre fuera de rango (1-12)");
    else filters.semester = n;
  }

  const status = read("status");
  if (status !== undefined) {
    if (typeof status !== "string" || !SUBJECT_STATUSES.includes(status.trim() as SubjectStatus)) {
      errors.push(`status debe ser uno de: ${SUBJECT_STATUSES.join(", ")}`);
    } else filters.status = status.trim() as SubjectStatus;
  }

  const search = read("search");
  if (search !== undefined) {
    if (typeof search !== "string" || search.trim().length > MAX_SUBJECT_NAME) {
      errors.push(`search debe ser un texto de máximo ${MAX_SUBJECT_NAME} caracteres`);
    } else filters.search = search.trim();
  }

  fail(errors);
  return filters;
};
// ---- ID de materia (parámetro de la URL) ----
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Se exporta porque los demás endpoints con :subjectId (#15 a #18, #20) la reutilizan
export const validateSubjectId = (value: unknown): string => {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new HttpError(400, "Datos inválidos", ["subjectId debe ser un UUID válido"]);
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
    if (!isNonEmptyString(b.name) || b.name.trim().length > MAX_SUBJECT_NAME) {
      errors.push(`name no puede estar vacío (máximo ${MAX_SUBJECT_NAME} caracteres)`);
    } else dto.name = b.name.trim();
  }

  if (b.code !== undefined) {
    if (!isNonEmptyString(b.code) || b.code.trim().length > MAX_SUBJECT_CODE) {
      errors.push(`code no puede estar vacío (máximo ${MAX_SUBJECT_CODE} caracteres)`);
    } else dto.code = b.code.trim();
  }

  if (b.credits !== undefined) {
    const c = b.credits;
    if (typeof c !== "number" || !Number.isInteger(c) || c < 1 || c > 10) {
      errors.push("Créditos deben ser un número entero entre 1 y 10");
    } else dto.credits = c;
  }

  if (b.semester !== undefined) {
    const s = b.semester;
    if (typeof s !== "number" || !Number.isInteger(s) || s < 1 || s > 12) {
      errors.push("Semestre fuera de rango (1-12)");
    } else dto.semester = s;
  }

  if (b.teacher !== undefined) {
    if (typeof b.teacher !== "string" || b.teacher.length > MAX_TEACHER) {
      errors.push(`teacher debe ser un texto de máximo ${MAX_TEACHER} caracteres`);
    } else dto.teacher = b.teacher.trim(); // "" es válido: borra el profesor
  }

  if (b.color !== undefined) {
    if (typeof b.color !== "string" || !HEX_COLOR_REGEX.test(b.color)) {
      errors.push("color debe ser un hexadecimal válido, por ejemplo #3B82F6");
    } else dto.color = b.color;
  }

  // schedule REEMPLAZA todo el horario; [] lo borra
  if (b.schedule !== undefined) dto.schedule = parseSchedule(b.schedule, errors);

  fail(errors);

  // Regla: al menos un campo (los desconocidos como id, userId o status no cuentan)
  if (Object.keys(dto).length === 0) {
    throw new HttpError(400, "Datos inválidos", [
      "Debes enviar al menos un campo: name, code, credits, semester, teacher, color o schedule",
    ]);
  }

  return dto;
};
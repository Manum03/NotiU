import { ChangePasswordDto, LoginDto, RegisterDto } from "../models/auth.dto";
import { UserRole } from "../models/user.model";
import { HttpError } from "./http-error";
import { UpdateProfileDto } from "../models/profile.dto";

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

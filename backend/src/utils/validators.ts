import { ChangePasswordDto, LoginDto, RegisterDto } from "../models/auth.dto";
import { UserRole } from "../models/user.model";
import { HttpError } from "./http-error";

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

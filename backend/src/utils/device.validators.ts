import { DevicePlatform } from "../services/device.service";
import { HttpError } from "./http-error";

const PLATFORMS: DevicePlatform[] = ["android", "ios", "web"];

const ensureObject = (body: unknown): Record<string, unknown> => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "El cuerpo de la petición debe ser un objeto JSON");
  }
  return body as Record<string, unknown>;
};

export const validateRegisterDevice = (body: unknown): { token: string; platform: DevicePlatform } => {
  const b = ensureObject(body);
  const errors: string[] = [];
  if (typeof b.token !== "string" || b.token.trim().length === 0) errors.push("token es obligatorio");
  if (typeof b.platform !== "string" || !PLATFORMS.includes(b.platform as DevicePlatform)) {
    errors.push(`platform debe ser uno de: ${PLATFORMS.join(", ")}`);
  }
  if (errors.length > 0) throw new HttpError(400, "Datos inválidos", errors);
  return { token: (b.token as string).trim(), platform: b.platform as DevicePlatform };
};

export const validateDeviceToken = (body: unknown): string => {
  const b = ensureObject(body);
  if (typeof b.token !== "string" || b.token.trim().length === 0) {
    throw new HttpError(400, "Datos inválidos", ["token es obligatorio"]);
  }
  return b.token.trim();
};

import { ConnectClassroomDto, ConnectMoodleDto } from "../models/integration.dto";
import { INTEGRATION_PROVIDERS, IntegrationProvider } from "../models/integration.model";
import { HttpError } from "./http-error";

const MAX_URL = 2000;
const MAX_CODE = 2000;

const ensureObject = (body: unknown): Record<string, unknown> => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "El cuerpo de la petición debe ser un objeto JSON");
  }
  return body as Record<string, unknown>;
};

export const validateProvider = (value: unknown): IntegrationProvider => {
  if (typeof value !== "string" || !INTEGRATION_PROVIDERS.includes(value as IntegrationProvider)) {
    throw new HttpError(400, "Datos inválidos", [`provider debe ser uno de: ${INTEGRATION_PROVIDERS.join(", ")}`]);
  }
  return value as IntegrationProvider;
};

export const validateConnectMoodle = (body: unknown): ConnectMoodleDto => {
  const b = ensureObject(body);
  if (typeof b.icalUrl !== "string" || b.icalUrl.trim().length === 0 || b.icalUrl.length > MAX_URL) {
    throw new HttpError(400, "Datos inválidos", [
      "icalUrl es obligatorio: pega el enlace de 'Exportar calendario' de Moodle",
    ]);
  }
  return { icalUrl: b.icalUrl.trim() };
};

export const validateConnectClassroom = (body: unknown): ConnectClassroomDto => {
  const b = ensureObject(body);
  if (typeof b.serverAuthCode !== "string" || b.serverAuthCode.trim().length === 0 || b.serverAuthCode.length > MAX_CODE) {
    throw new HttpError(400, "Datos inválidos", ["serverAuthCode es obligatorio (lo entrega Google Sign-In)"]);
  }
  return { serverAuthCode: b.serverAuthCode.trim() };
};

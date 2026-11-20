import { OAuth2Client } from "google-auth-library";
import { config } from "../../config/env";
import { ExternalTask, PlatformStatus } from "../../models/task.model";
import { endOfDayInAppTimezone } from "../../utils/dates";
import { ConnectorContext, ConnectorError, ReauthRequiredError, TaskConnector } from "./types";

// Conector de Google Classroom (solo lectura, como estudiante).
// Flujo: la app hace Google Sign-In pidiendo estos scopes con acceso offline y manda el
// `serverAuthCode` al backend; aquí se cambia por un refresh token que se guarda cifrado.
// Docs: https://developers.google.com/workspace/classroom/reference/rest

export const CLASSROOM_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
];

const API = "https://classroom.googleapis.com/v1";
const MAX_PAGES = 5;
const PAST_WINDOW_DAYS = 14;
const UNDATED_MAX_AGE_DAYS = 30; // tareas sin fecha: solo si se publicaron hace poco
const MAX_DESCRIPTION = 2000;

interface Course {
  id: string;
  name: string;
  section?: string;
}

interface CourseWork {
  id: string;
  title: string;
  description?: string;
  alternateLink?: string;
  creationTime?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number };
}

interface StudentSubmission {
  courseWorkId: string;
  state: string;
}

const createClient = (): OAuth2Client => {
  if (!config.google.clientId || !config.google.clientSecret) {
    throw new ConnectorError("La integración con Classroom no está configurada en el servidor");
  }
  return new OAuth2Client({
    clientId: config.google.clientId,
    clientSecret: config.google.clientSecret,
    redirectUri: config.google.redirectUri,
  });
};

const isInvalidGrant = (err: unknown): boolean => {
  const e = err as { message?: string; response?: { data?: { error?: string } } };
  return e?.response?.data?.error === "invalid_grant" || /invalid_grant/i.test(e?.message ?? "");
};

const httpStatus = (err: unknown): number | undefined =>
  (err as { response?: { status?: number } })?.response?.status;

// GET paginado contra la API de Classroom
const listAll = async <T>(client: OAuth2Client, path: string, key: string): Promise<T[]> => {
  const items: T[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${API}${path}`);
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await client.request<Record<string, unknown>>({ url: url.toString() });
    items.push(...(((res.data[key] as T[] | undefined) ?? []) as T[]));
    pageToken = res.data.nextPageToken as string | undefined;
    if (!pageToken) break;
  }
  return items;
};

// La fecha de Classroom viene en UTC; si no trae hora, se toma el final del día
const toDueAt = (cw: CourseWork): { dueAt: Date | null; allDay: boolean } => {
  if (!cw.dueDate) return { dueAt: null, allDay: false };
  const { year, month, day } = cw.dueDate;
  if (!cw.dueTime || (cw.dueTime.hours === undefined && cw.dueTime.minutes === undefined)) {
    return { dueAt: endOfDayInAppTimezone(year, month, day), allDay: true };
  }
  return {
    dueAt: new Date(Date.UTC(year, month - 1, day, cw.dueTime.hours ?? 0, cw.dueTime.minutes ?? 0)),
    allDay: false,
  };
};

const toPlatformStatus = (state: string | undefined): PlatformStatus => {
  if (state === "TURNED_IN" || state === "RETURNED") return "submitted";
  if (state === undefined) return "unknown";
  return "pending";
};

export const classroomConnector: TaskConnector & {
  exchangeCode(serverAuthCode: string): Promise<{ refreshToken: string; email: string | null }>;
  revoke(refreshToken: string): Promise<void>;
} = {
  provider: "classroom",
  source: "CLASSROOM",

  // Cambia el serverAuthCode de la app por un refresh token
  async exchangeCode(serverAuthCode: string) {
    const client = createClient();
    let tokens;
    try {
      ({ tokens } = await client.getToken(serverAuthCode));
    } catch (err) {
      console.error("[classroom] Error al canjear el código", err);
      throw new ConnectorError("Google rechazó el código de autorización. Intenta conectar de nuevo.");
    }
    if (!tokens.refresh_token) {
      throw new ConnectorError(
        "Google no devolvió un refresh token. En la app, pide acceso offline (offlineAccess: true) y vuelve a conectar.",
      );
    }
    const granted = (tokens.scope ?? "").split(" ");
    const missing = CLASSROOM_SCOPES.filter((s) => !granted.includes(s));
    if (missing.length > 0) {
      throw new ConnectorError("Debes aceptar los permisos de lectura de Classroom para conectar la cuenta");
    }

    let email: string | null = null;
    if (tokens.id_token) {
      try {
        const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.google.clientId });
        email = ticket.getPayload()?.email ?? null;
      } catch {
        email = null; // el correo es solo informativo
      }
    }
    return { refreshToken: tokens.refresh_token, email };
  },

  async revoke(refreshToken: string) {
    try {
      await createClient().revokeToken(refreshToken);
    } catch {
      // Si ya estaba revocado no importa
    }
  },

  async fetchTasks(ctx: ConnectorContext): Promise<ExternalTask[]> {
    const client = createClient();
    client.setCredentials({ refresh_token: ctx.secret });
    const now = Date.now();

    try {
      const courses = await listAll<Course>(client, "/courses?studentId=me&courseStates=ACTIVE", "courses");
      const tasks: ExternalTask[] = [];

      for (const course of courses) {
        const id = encodeURIComponent(course.id);
        const [work, submissions] = await Promise.all([
          listAll<CourseWork>(client, `/courses/${id}/courseWork?courseWorkStates=PUBLISHED`, "courseWork"),
          listAll<StudentSubmission>(
            client,
            `/courses/${id}/courseWork/-/studentSubmissions?userId=me`,
            "studentSubmissions",
          ),
        ]);
        const stateByWork = new Map(submissions.map((s) => [s.courseWorkId, s.state]));

        for (const cw of work) {
          const { dueAt, allDay } = toDueAt(cw);
          if (dueAt && dueAt.getTime() < now - PAST_WINDOW_DAYS * 86_400_000) continue;
          if (!dueAt) {
            const created = cw.creationTime ? new Date(cw.creationTime).getTime() : 0;
            if (created < now - UNDATED_MAX_AGE_DAYS * 86_400_000) continue;
          }
          tasks.push({
            externalId: `${course.id}:${cw.id}`,
            title: cw.title,
            description: cw.description ? cw.description.slice(0, MAX_DESCRIPTION) : null,
            courseName: course.section ? `${course.name} (${course.section})` : course.name,
            url: cw.alternateLink ?? null,
            dueAt,
            allDay,
            platformStatus: toPlatformStatus(stateByWork.get(cw.id)),
          });
        }
      }
      return tasks;
    } catch (err) {
      if (isInvalidGrant(err)) {
        throw new ReauthRequiredError("Google revocó el acceso. Vuelve a conectar Classroom.");
      }
      if (httpStatus(err) === 403) {
        throw new ConnectorError(
          "Google no permitió leer Classroom. Puede que tu universidad bloquee apps externas o falten permisos.",
        );
      }
      throw err;
    }
  },
};

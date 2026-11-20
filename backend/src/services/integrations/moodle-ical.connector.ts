import ical, { ParameterValue, VEvent } from "node-ical";
import { ExternalTask } from "../../models/task.model";
import { endOfDayInAppTimezone } from "../../utils/dates";
import { assertPublicUrl } from "../../utils/url-safety";
import { ConnectorContext, ConnectorError, ReauthRequiredError, TaskConnector } from "./types";

// Conector de Moodle usando el enlace de exportación del calendario (iCal).
// En Moodle: Calendario > Importar o exportar calendarios > Exportar calendario
//   - Eventos a exportar: "Todos"   - Período: "Eventos recientes y próximos"
// El enlace tiene la forma:
//   https://<moodle>/calendar/export_execute.php?userid=..&authtoken=..&preset_what=all&preset_time=recentupcoming
// No requiere la contraseña del estudiante. El enlace es privado: se guarda cifrado.

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const PAST_WINDOW_DAYS = 14; // no se importan entregas que vencieron hace más de 2 semanas
const MAX_DESCRIPTION = 2000;

// Moodle agrega un sufijo al nombre según el tipo de evento ("Taller 3 is due").
// Se quita para que el título sea solo el nombre de la actividad.
const DUE_SUFFIX = /\s+(is due|closes|due|vence|se cierra|cierra|debe entregarse|fecha de entrega)$/i;
// Los eventos de apertura no son entregas: se ignoran
const OPENS_SUFFIX = /\s+(opens|se abre|abre|apertura)$/i;

const text = (value: ParameterValue | undefined): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  return String((value as { val?: unknown }).val ?? "");
};

// Valida y normaliza el enlace que pega el usuario (acepta webcal://)
export const normalizeIcalUrl = (raw: string): URL => {
  let value = raw.trim();
  if (value.toLowerCase().startsWith("webcal://")) value = `https://${value.slice("webcal://".length)}`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConnectorError("El enlace del calendario no es una URL válida");
  }
  return url;
};

const download = async (url: URL): Promise<string> => {
  try {
    await assertPublicUrl(url);
  } catch (err) {
    throw new ConnectorError((err as Error).message);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "text/calendar, */*" },
      redirect: "follow",
    });
  } catch {
    throw new ConnectorError("No se pudo descargar el calendario de Moodle (tiempo de espera o red)");
  }

  // Moodle responde 401/403 cuando el authtoken ya no es válido (p. ej. el usuario lo regeneró)
  if (res.status === 401 || res.status === 403 || res.status === 404) {
    throw new ReauthRequiredError("El enlace del calendario ya no es válido. Genera uno nuevo en Moodle.");
  }
  if (!res.ok) throw new ConnectorError(`Moodle respondió con error ${res.status}`);

  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new ConnectorError("El calendario es demasiado grande");
  const body = await res.text();
  if (body.length > MAX_BYTES) throw new ConnectorError("El calendario es demasiado grande");

  if (!body.includes("BEGIN:VCALENDAR")) {
    // Típico cuando la URL es la de la página de Moodle y no la de exportación
    throw new ConnectorError(
      "El enlace no devolvió un calendario. Copia el enlace que aparece después de pulsar 'Obtener URL del calendario'.",
    );
  }
  return body;
};

const toExternalTask = (event: VEvent, now: Date): ExternalTask | null => {
  const rawTitle = text(event.summary).trim();
  if (!rawTitle || OPENS_SUFFIX.test(rawTitle)) return null;
  if (event.status === "CANCELLED") return null;

  const start = event.start ? new Date(event.start) : null;
  const allDay = event.datetype === "date";
  // Evento de día completo: node-ical lo crea a medianoche en la zona del servidor; se toma
  // ese día calendario y se usa las 23:59 en la zona de la app como fecha límite
  const dueAt =
    start && allDay ? endOfDayInAppTimezone(start.getFullYear(), start.getMonth() + 1, start.getDate()) : start;

  if (dueAt && dueAt.getTime() < now.getTime() - PAST_WINDOW_DAYS * 86_400_000) return null;

  const description = text(event.description).trim();
  return {
    externalId: event.uid,
    title: rawTitle.replace(DUE_SUFFIX, "").trim() || rawTitle,
    description: description ? description.slice(0, MAX_DESCRIPTION) : null,
    // Moodle pone el nombre corto del curso en CATEGORIES
    courseName: event.categories?.[0]?.trim() || null,
    url: typeof event.url === "string" && event.url ? event.url : null,
    dueAt,
    allDay,
    platformStatus: "unknown", // el iCal no informa si ya se entregó
  };
};

// Exportado para poder probar el parser sin red
export const parseMoodleIcs = (body: string, now = new Date()): ExternalTask[] => {
  const calendar = ical.sync.parseICS(body);
  const tasks: ExternalTask[] = [];
  for (const component of Object.values(calendar)) {
    if (!component || (component as { type?: string }).type !== "VEVENT") continue;
    const task = toExternalTask(component as VEvent, now);
    if (task) tasks.push(task);
  }
  return tasks;
};

export const moodleIcalConnector: TaskConnector = {
  provider: "moodle",
  source: "MOODLE",

  async fetchTasks(ctx: ConnectorContext): Promise<ExternalTask[]> {
    const body = await download(normalizeIcalUrl(ctx.secret));
    return parseMoodleIcs(body);
  },
};

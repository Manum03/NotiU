import { db } from "../config/firebase";
import { SyncResultDto } from "../models/integration.dto";
import { Integration, PROVIDER_LABEL, PROVIDER_NOTIFICATION_SOURCE, SyncStats } from "../models/integration.model";
import { NotificationCategory } from "../models/notification.model";
import { ExternalTask, Task, TaskPriority } from "../models/task.model";
import { decrypt } from "../utils/crypto";
import { formatDue, toAppDateParts } from "../utils/dates";
import { chunk } from "../utils/firestore";
import { connectors } from "./integrations";
import { ReauthRequiredError } from "./integrations/types";
import { notificationService } from "./notification.service";
import { reminderService } from "./reminder.service";
import { settingsService } from "./settings.service";
import { isActionable, taskDueAt, taskIdFor, taskService, taskToDoc, tasksCol } from "./task.service";

// Motor de sincronización: descarga las tareas de una plataforma, las compara con lo
// guardado y decide qué avisar.
//   - Tarea nueva            -> notificación "Nueva tarea" (en la 1.ª sincronización, solo un resumen)
//   - Cambió la fecha        -> notificación "Cambió la fecha"
//   - Siempre                -> se (re)programan los recordatorios

const integrationsCol = db.collection("integrations");
const MAX_INDIVIDUAL_NOTIFICATIONS = 5; // si hay más tareas nuevas, se envía un resumen
const URGENT_WINDOW_MS = 48 * 3_600_000;

// Evita que la misma integración se sincronice dos veces a la vez (job + botón "sincronizar")
const running = new Set<string>();

type TaskEvent = { type: "new" | "dueChanged"; task: Task };

const categoryFor = (task: Task, now: Date): NotificationCategory => {
  const dueAt = taskDueAt(task);
  return dueAt && dueAt.getTime() - now.getTime() < URGENT_WINDOW_MS ? "URGENT" : "INFORMATIVE";
};

const dueText = (task: Task): string => {
  const dueAt = taskDueAt(task);
  return dueAt ? `vence ${formatDue(dueAt, task.dueTime === null)}` : "sin fecha de entrega";
};

// Prioridad inicial de una tarea importada según cuánto falta (el usuario puede cambiarla)
const initialPriority = (dueAt: Date | null, now: Date): TaskPriority => {
  if (!dueAt) return "baja";
  const hours = (dueAt.getTime() - now.getTime()) / 3_600_000;
  return hours < 24 ? "alta" : hours < 72 ? "media" : "baja";
};

// Fecha de la plataforma -> dueDate/dueTime en hora de Colombia (sin hora si es de día completo)
const toDueParts = (ext: ExternalTask): { dueDate: string | null; dueTime: string | null } => {
  if (!ext.dueAt) return { dueDate: null, dueTime: null };
  const { date, time } = toAppDateParts(ext.dueAt);
  return { dueDate: date, dueTime: ext.allDay ? null : time };
};

// Mezcla lo que llegó de la plataforma con lo guardado. La plataforma manda en título,
// descripción, curso, enlace y fecha; el estudiante manda en estado, prioridad, materia y subtareas.
const merge = (userId: string, integration: Integration, ext: ExternalTask, prev: Task | undefined, now: Date): Task => {
  const source = connectors[integration.provider].source;
  const { dueDate, dueTime } = toDueParts(ext);
  // Si la plataforma reporta la entrega (Classroom), se marca como realizada una sola vez
  const submittedNow = ext.platformStatus === "submitted" && prev?.platformStatus !== "submitted";
  const status = submittedNow ? "realizada" : (prev?.status ?? "pendiente");
  return {
    id: taskIdFor(source, ext.externalId),
    userId,
    title: ext.title,
    description: ext.description ?? "",
    type: prev?.type ?? "tarea",
    status,
    priority: prev?.priority ?? initialPriority(ext.dueAt, now),
    subjectId: prev?.subjectId ?? null,
    dueDate,
    dueTime,
    subtasks: prev?.subtasks ?? [],
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    completedAt: status === "realizada" ? (prev?.completedAt ?? now) : null,
    archivedAt: prev?.archivedAt ?? null,
    source,
    externalId: ext.externalId,
    courseName: ext.courseName,
    url: ext.url,
    platformStatus: ext.platformStatus,
  };
};

const sameDue = (a: Task, b: Task): boolean => a.dueDate === b.dueDate && a.dueTime === b.dueTime;

const notifyEvents = async (
  integration: Integration,
  events: TaskEvent[],
  isFirstSync: boolean,
  importedPending: number,
  now: Date,
): Promise<number> => {
  const { userId, provider } = integration;
  const source = PROVIDER_NOTIFICATION_SOURCE[provider];
  const label = PROVIDER_LABEL[provider];

  if (isFirstSync) {
    await notificationService.notifyUser(userId, {
      title: `✅ ${label} conectado`,
      body:
        importedPending > 0
          ? `Importamos ${importedPending} tarea${importedPending === 1 ? "" : "s"} pendiente${importedPending === 1 ? "" : "s"}. Te recordaremos antes de cada entrega.`
          : "Todo al día: no hay entregas pendientes por ahora. Te avisaremos cuando aparezca una nueva.",
      category: "INFORMATIVE",
      source,
      kind: "SYNC_SUMMARY",
    });
    return 1;
  }

  const created = events.filter((e) => e.type === "new");
  const changed = events.filter((e) => e.type === "dueChanged");
  let sent = 0;

  if (created.length > MAX_INDIVIDUAL_NOTIFICATIONS) {
    await notificationService.notifyUser(userId, {
      title: `📚 ${created.length} tareas nuevas en ${label}`,
      body: created
        .slice(0, 3)
        .map((e) => e.task.title)
        .join(" · "),
      category: created.some((e) => categoryFor(e.task, now) === "URGENT") ? "URGENT" : "INFORMATIVE",
      source,
      kind: "SYNC_SUMMARY",
    });
    sent++;
  } else {
    for (const { task } of created) {
      await notificationService.notifyUser(userId, {
        title: `📚 Nueva tarea: ${task.title}`,
        body: `${task.courseName ? `${task.courseName} · ` : ""}${dueText(task)}`,
        category: categoryFor(task, now),
        source,
        kind: "NEW_TASK",
        taskId: task.id,
        externalId: task.externalId,
      });
      sent++;
    }
  }

  for (const { task } of changed.slice(0, MAX_INDIVIDUAL_NOTIFICATIONS)) {
    await notificationService.notifyUser(userId, {
      title: `📅 Cambió la fecha: ${task.title}`,
      body: `Ahora ${dueText(task)}`,
      category: "URGENT",
      source,
      kind: "DUE_DATE_CHANGED",
      taskId: task.id,
      externalId: task.externalId,
    });
    sent++;
  }
  return sent;
};

export const syncService = {
  // `prefetched` permite reutilizar las tareas ya descargadas al validar una conexión nueva
  async syncIntegration(integration: Integration, prefetched?: ExternalTask[]): Promise<SyncResultDto> {
    const started = Date.now();
    const now = new Date();
    const ref = integrationsCol.doc(integration.id);

    if (running.has(integration.id)) {
      return { provider: integration.provider, total: 0, created: 0, updated: 0, notified: 0, durationMs: 0 };
    }
    running.add(integration.id);

    try {
      const connector = connectors[integration.provider];
      const external =
        prefetched ?? (await connector.fetchTasks({ userId: integration.userId, secret: decrypt(integration.secret) }));

      const existing = await taskService.listBySource(integration.userId, connector.source);
      const isFirstSync = integration.lastSuccessAt === null;
      const offsets = (await settingsService.getSettings(integration.userId)).reminders.offsetsMinutes;

      const events: TaskEvent[] = [];
      const toSave: Task[] = [];
      const seen = new Set<string>();
      let created = 0;
      let updated = 0;

      for (const ext of external) {
        const id = taskIdFor(connector.source, ext.externalId);
        if (seen.has(id)) continue; // por si la plataforma repite un evento
        seen.add(id);

        const prev = existing.get(id);
        const task = merge(integration.userId, integration, ext, prev, now);

        if (!prev) {
          created++;
          if (isActionable(task, now)) events.push({ type: "new", task });
        } else {
          const changed =
            prev.title !== task.title ||
            prev.description !== task.description ||
            prev.courseName !== task.courseName ||
            prev.url !== task.url ||
            prev.platformStatus !== task.platformStatus ||
            prev.status !== task.status ||
            !sameDue(prev, task);
          if (!changed) continue; // nada que guardar ni reprogramar
          updated++;
          if (!sameDue(prev, task) && isActionable(task, now)) events.push({ type: "dueChanged", task });
        }
        toSave.push(task);
      }

      for (const group of chunk(toSave, 400)) {
        const batch = db.batch();
        group.forEach((t) => batch.set(tasksCol(integration.userId).doc(t.id), taskToDoc(t)));
        await batch.commit();
      }
      for (const task of toSave) await reminderService.scheduleForTask(task, offsets);

      const importedPending = toSave.filter((t) => isActionable(t, now)).length;
      const notified = await notifyEvents(integration, events, isFirstSync, importedPending, now);

      const stats: SyncStats = { total: seen.size, created, updated, notified };
      await ref.set(
        { status: "active", lastSyncAt: now, lastSuccessAt: now, lastError: null, lastStats: stats, updatedAt: now },
        { merge: true },
      );
      return { provider: integration.provider, ...stats, durationMs: Date.now() - started };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      await ref.set(
        {
          status: err instanceof ReauthRequiredError ? "needs_reauth" : "error",
          lastSyncAt: now,
          lastError: message,
          updatedAt: now,
        },
        { merge: true },
      );
      // Avisar una sola vez cuando hay que volver a conectar
      if (err instanceof ReauthRequiredError && integration.status !== "needs_reauth") {
        await notificationService.notifyUser(integration.userId, {
          title: `⚠️ Reconecta ${PROVIDER_LABEL[integration.provider]}`,
          body: message,
          category: "URGENT",
          source: "SYSTEM",
          kind: "SYSTEM",
        });
      }
      throw err;
    } finally {
      running.delete(integration.id);
    }
  },
};

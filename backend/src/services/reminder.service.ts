import { db } from "../config/firebase";
import { Task } from "../models/task.model";
import { NotificationSource } from "../models/notification.model";
import { chunk, toDateOrNow } from "../utils/firestore";
import { formatDue, relativeFromNow } from "../utils/dates";
import { notificationService } from "./notification.service";
import { settingsService } from "./settings.service";
import { isActionable, taskDueAt, taskService } from "./task.service";

// Recordatorios pendientes: colección global `reminders/{userId}_{taskId}_{offset}`.
// El job revisa cada minuto los que ya vencieron (sendAt <= ahora), los envía y los borra.
// Se usan consultas de un solo campo (taskKey o sendAt) para no necesitar índices compuestos.
const remindersCol = db.collection("reminders");

const taskKey = (userId: string, taskId: string): string => `${userId}_${taskId}`;

const sourceToNotificationSource = (task: Task): NotificationSource =>
  task.source === "MANUAL" ? "SYSTEM" : task.source;

const deleteByTaskKey = async (key: string): Promise<void> => {
  const snap = await remindersCol.where("taskKey", "==", key).get();
  for (const group of chunk(snap.docs, 400)) {
    const batch = db.batch();
    group.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
};

export const reminderService = {
  // Borra los recordatorios de la tarea y, si sigue pendiente, crea los nuevos.
  // `offsets` se puede pasar para no leer los ajustes en cada tarea durante una sincronización.
  async scheduleForTask(task: Task, offsets?: number[]): Promise<void> {
    const key = taskKey(task.userId, task.id);
    await deleteByTaskKey(key);

    const now = new Date();
    const dueAt = taskDueAt(task);
    if (!dueAt || !isActionable(task, now)) return;

    const minutes = offsets ?? (await settingsService.getSettings(task.userId)).reminders.offsetsMinutes;
    const batch = db.batch();
    let count = 0;
    for (const offset of minutes) {
      const sendAt = new Date(dueAt.getTime() - offset * 60_000);
      if (sendAt <= now) continue; // ese recordatorio ya pasó
      batch.set(remindersCol.doc(`${key}_${offset}`), {
        taskKey: key,
        userId: task.userId,
        taskId: task.id,
        offsetMinutes: offset,
        sendAt,
      });
      count++;
    }
    if (count > 0) await batch.commit();
  },

  async cancelForTask(userId: string, taskId: string): Promise<void> {
    await deleteByTaskKey(taskKey(userId, taskId));
  },

  async rescheduleAllForUser(userId: string): Promise<void> {
    const offsets = (await settingsService.getSettings(userId)).reminders.offsetsMinutes;
    for (const task of await taskService.listAll(userId)) {
      await reminderService.scheduleForTask(task, offsets);
    }
  },

  // Lo llama el job periódico. Devuelve cuántos recordatorios se enviaron.
  async processDue(now = new Date(), limit = 200): Promise<number> {
    const snap = await remindersCol.where("sendAt", "<=", now).orderBy("sendAt").limit(limit).get();
    let sent = 0;

    for (const doc of snap.docs) {
      const userId = String(doc.get("userId"));
      const taskId = String(doc.get("taskId"));
      try {
        const task = await taskService.get(userId, taskId);
        const dueAt = task ? taskDueAt(task) : null;
        // Si el servidor estuvo dormido y la entrega ya pasó, no se envía un recordatorio viejo
        if (task && dueAt && isActionable(task, now)) {
          await notificationService.notifyUser(userId, {
            title: `⏰ ${task.title}`,
            body: `Vence ${relativeFromNow(dueAt, now)} (${formatDue(dueAt, task.dueTime === null)})${
              task.courseName ? ` · ${task.courseName}` : ""
            }`,
            category: "URGENT",
            source: sourceToNotificationSource(task),
            kind: "REMINDER",
            taskId: task.id,
            payload: { offsetMinutes: doc.get("offsetMinutes"), scheduledFor: toDateOrNow(doc.get("sendAt")).toISOString() },
          });
          sent++;
        }
      } catch (err) {
        console.error(`[reminders] Falló el recordatorio ${doc.id}`, err);
      } finally {
        await doc.ref.delete();
      }
    }
    return sent;
  },
};

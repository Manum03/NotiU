import { config } from "../config/env";
import { integrationService } from "../services/integration.service";
import { reminderService } from "../services/reminder.service";

// Tareas periódicas del servidor:
//   - Sincronizar Moodle/Classroom de todos los usuarios cada SYNC_INTERVAL_MINUTES
//   - Enviar los recordatorios vencidos cada REMINDER_CHECK_SECONDS
// Ojo: en hostings gratuitos que "duermen" el servidor, los jobs se pausan mientras duerme.

// Ejecuta `fn` sin que dos corridas se superpongan
const guarded = (name: string, fn: () => Promise<unknown>) => {
  let busy = false;
  return async (): Promise<void> => {
    if (busy) return;
    busy = true;
    try {
      await fn();
    } catch (err) {
      console.error(`[jobs] ${name} falló`, err);
    } finally {
      busy = false;
    }
  };
};

export const startJobs = (): void => {
  if (!config.jobs.enabled) {
    console.log("[jobs] Desactivados (JOBS_ENABLED=false)");
    return;
  }

  const syncAll = guarded("sync", async () => {
    const result = await integrationService.syncAllActive();
    if (result.ok + result.failed > 0) console.log(`[jobs] sync: ${result.ok} ok, ${result.failed} con error`);
  });

  const sendReminders = guarded("reminders", async () => {
    const sent = await reminderService.processDue();
    if (sent > 0) console.log(`[jobs] ${sent} recordatorio(s) enviados`);
  });

  setTimeout(syncAll, 15_000); // primera sincronización poco después de arrancar
  setInterval(syncAll, config.jobs.syncIntervalMinutes * 60_000);

  void sendReminders();
  setInterval(sendReminders, config.jobs.reminderCheckSeconds * 1000);

  console.log(
    `[jobs] Sync cada ${config.jobs.syncIntervalMinutes} min · recordatorios cada ${config.jobs.reminderCheckSeconds} s`,
  );
};

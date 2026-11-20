import { config } from "../config/env";

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

// Límites para los recordatorios configurables por el usuario
export const MAX_REMINDER_OFFSETS = 5;
export const MIN_REMINDER_OFFSET_MINUTES = 5;
export const MAX_REMINDER_OFFSET_MINUTES = 7 * 24 * 60; // 1 semana

export interface Settings {
  theme: Theme;
  notifications: {
    email: boolean;
    push: boolean;
    studyReminders: boolean;
  };
  reminders: {
    // Minutos antes de la fecha de entrega en que se envía cada recordatorio
    offsetsMinutes: number[];
  };
  privacy: {
    showProfileToPeers: boolean;
  };
}

// Función (y no constante) para devolver siempre un objeto nuevo y evitar
// que alguien modifique los valores por defecto compartidos
export const createDefaultSettings = (): Settings => ({
  theme: "system",
  notifications: { email: true, push: true, studyReminders: false },
  reminders: { offsetsMinutes: [...config.defaultReminderOffsetsMinutes] },
  privacy: { showProfileToPeers: true },
});

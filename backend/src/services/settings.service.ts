import { SettingsResponseDto } from "../models/settings.dto";
import { Settings, createDefaultSettings } from "../models/settings.model";

// ---- ""Base de datos"" en memoria (se reinicia al reiniciar el servidor) ----
// Llave: id del usuario. Si no hay entrada, el usuario usa los valores por defecto
const settingsByUser = new Map<number, Settings>();

const cloneSettings = (s: Settings): Settings => ({
  theme: s.theme,
  notifications: { ...s.notifications },
  privacy: { ...s.privacy },
});

export const settingsService = {
  getSettings(userId: number): SettingsResponseDto {
    // Leer no modifica nada: si no hay ajustes guardados, se devuelven los defaults
    const stored = settingsByUser.get(userId) ?? createDefaultSettings();
    return cloneSettings(stored);
  },
};
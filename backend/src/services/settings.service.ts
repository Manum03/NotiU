import {
  SettingsResponseDto,
  UpdateSettingsDto,
  UpdateSettingsResponseDto,
} from "../models/settings.dto";
import { Settings, createDefaultSettings } from "../models/settings.model";

// ---- Almacenamiento en memoria (no hay base de datos) ----
// Los datos se pierden al reiniciar el servidor.
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

  updateSettings(userId: number, dto: UpdateSettingsDto): UpdateSettingsResponseDto {
    // Se parte de una COPIA de lo guardado (o de los defaults): si algo fallara a
    // mitad del merge, lo que está guardado no queda a medio modificar
    const current = cloneSettings(settingsByUser.get(userId) ?? createDefaultSettings());

    // Merge: solo se pisan las llaves que llegaron, el resto se conserva
    if (dto.theme !== undefined) current.theme = dto.theme;
    if (dto.notifications) Object.assign(current.notifications, dto.notifications);
    if (dto.privacy) Object.assign(current.privacy, dto.privacy);

    settingsByUser.set(userId, current);
    return { message: "Ajustes guardados", settings: cloneSettings(current) };
  },
};
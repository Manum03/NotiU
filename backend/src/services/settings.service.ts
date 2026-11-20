import { db } from "../config/firebase";
import {
  SettingsResponseDto,
  UpdateSettingsDto,
  UpdateSettingsResponseDto,
} from "../models/settings.dto";
import { Settings, createDefaultSettings } from "../models/settings.model";

// Ajustes en Firestore: documento `settings/{uid}`.
// Si el usuario no tiene documento, usa los valores por defecto.
const settingsCol = db.collection("settings");

// Mezcla lo guardado con los defaults: así los campos nuevos (p. ej. reminders)
// existen aunque el documento sea antiguo
const withDefaults = (stored: Partial<Settings> | undefined): Settings => {
  const d = createDefaultSettings();
  return {
    theme: stored?.theme ?? d.theme,
    notifications: { ...d.notifications, ...stored?.notifications },
    reminders: { ...d.reminders, ...stored?.reminders },
    privacy: { ...d.privacy, ...stored?.privacy },
  };
};

export const settingsService = {
  async getSettings(userId: string): Promise<SettingsResponseDto> {
    const snap = await settingsCol.doc(userId).get();
    return withDefaults(snap.data() as Partial<Settings> | undefined);
  },

  async updateSettings(userId: string, dto: UpdateSettingsDto): Promise<UpdateSettingsResponseDto> {
    const current = await settingsService.getSettings(userId);

    // Merge: solo se pisan las llaves que llegaron, el resto se conserva
    if (dto.theme !== undefined) current.theme = dto.theme;
    if (dto.notifications) Object.assign(current.notifications, dto.notifications);
    if (dto.reminders) Object.assign(current.reminders, dto.reminders);
    if (dto.privacy) Object.assign(current.privacy, dto.privacy);

    await settingsCol.doc(userId).set(current);
    return { message: "Ajustes guardados", settings: current };
  },
};

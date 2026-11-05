import { Settings } from "./settings.model";

export type SettingsResponseDto = Settings;

// Todo es opcional y los grupos anidados también: PATCH = actualización parcial
export interface UpdateSettingsDto {
  theme?: Settings["theme"];
  notifications?: Partial<Settings["notifications"]>;
  privacy?: Partial<Settings["privacy"]>;
}

export interface UpdateSettingsResponseDto {
  message: string;
  settings: Settings;
}
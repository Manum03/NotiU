// Ajustes del usuario (GET/PATCH /settings)
export type SettingsDto = {
  theme: 'light' | 'dark' | 'system';
  notifications: { email: boolean; push: boolean; studyReminders: boolean };
  reminders: { offsetsMinutes: number[] };
  privacy: { showProfileToPeers: boolean };
};

export type UpdateSettingsResponse = { message: string; settings: SettingsDto };

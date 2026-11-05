export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export interface Settings {
  theme: Theme;
  notifications: {
    email: boolean;
    push: boolean;
    studyReminders: boolean;
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
  privacy: { showProfileToPeers: true },
});